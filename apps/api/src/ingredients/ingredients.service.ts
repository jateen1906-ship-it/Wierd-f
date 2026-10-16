import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { IngredientQueryDto } from './dto/ingredient-query.dto';
import {
  toIngredientResponse,
  type IngredientResponse,
  type PaginatedIngredientsResponse,
  type IngredientCategoriesResponse,
} from './dto/ingredient-response.dto';

/**
 * Standard canonical culinary categories defined by the domain model
 */
export const CANONICAL_CATEGORIES: readonly string[] = [
  'staple',
  'dairy',
  'vegetable',
  'fruit',
  'spice_seasoning',
  'sauce_condiment',
  'protein',
  'snack_instant',
  'oil_fat',
  'bakery',
  'other',
] as const;

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search and list canonical ingredients with case-insensitive matching and pagination
   */
  async findAll(queryDto: IngredientQueryDto): Promise<PaginatedIngredientsResponse> {
    const { query, category, page = 1, limit = 20 } = queryDto;

    const where: Prisma.IngredientWhereInput = {};

    if (query && query.trim()) {
      where.name = {
        contains: query.trim(),
        mode: 'insensitive',
      };
    }

    if (category) {
      where.category = category;
    }

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.ingredient.count({ where }),
      this.prisma.ingredient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map(toIngredientResponse),
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Retrieve a single canonical ingredient by its unique identifier
   */
  async findOne(id: string): Promise<IngredientResponse> {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID "${id}" was not found`);
    }

    return toIngredientResponse(ingredient);
  }

  /**
   * List distinct, canonical categories supported by the platform
   */
  async getCategories(): Promise<IngredientCategoriesResponse> {
    const distinctFromDb = await this.prisma.ingredient.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    const categoriesSet = new Set<string>(CANONICAL_CATEGORIES);
    for (const row of distinctFromDb) {
      if (row.category) {
        categoriesSet.add(row.category);
      }
    }

    const sortedCategories = Array.from(categoriesSet).sort();

    return {
      categories: sortedCategories,
      total: sortedCategories.length,
    };
  }
}
