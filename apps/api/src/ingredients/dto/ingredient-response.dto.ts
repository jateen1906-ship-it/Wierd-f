import type { Ingredient } from '@prisma/client';

/**
 * Publicly safe ingredient representation
 */
export interface IngredientResponse {
  id: string;
  name: string;
  category: string;
  commonSubstitutions: string[];
  isCommonAllergen: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standard paginated response envelope for ingredients
 */
export interface PaginatedIngredientsResponse {
  items: IngredientResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Ingredient category list response
 */
export interface IngredientCategoriesResponse {
  categories: string[];
  total: number;
}

/**
 * Map raw database ingredient to sanitized response object
 */
export function toIngredientResponse(ingredient: Ingredient): IngredientResponse {
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    commonSubstitutions: ingredient.commonSubstitutions ?? [],
    isCommonAllergen: ingredient.isCommonAllergen,
    createdAt: ingredient.createdAt.toISOString(),
    updatedAt: ingredient.updatedAt.toISOString(),
  };
}
