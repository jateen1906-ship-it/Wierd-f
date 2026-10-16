import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ParseIngredientIdPipe } from './pipes/parse-ingredient-id.pipe';
import { ingredientQuerySchema, type IngredientQueryDto } from './dto/ingredient-query.dto';
import type {
  IngredientResponse,
  PaginatedIngredientsResponse,
  IngredientCategoriesResponse,
} from './dto/ingredient-response.dto';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  /**
   * GET /api/v1/ingredients
   * Search and list canonical ingredients with pagination
   * Query params: query (optional string), category (optional string), page (default 1), limit (default 20)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query(new ZodValidationPipe(ingredientQuerySchema)) queryDto: IngredientQueryDto,
  ): Promise<PaginatedIngredientsResponse> {
    return this.ingredientsService.findAll(queryDto);
  }

  /**
   * GET /api/v1/ingredients/categories
   * Return distinct canonical culinary categories
   * NOTE: Must be defined before :id route so 'categories' is not interpreted as an ID
   */
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async getCategories(): Promise<IngredientCategoriesResponse> {
    return this.ingredientsService.getCategories();
  }

  /**
   * GET /api/v1/ingredients/:id
   * Get single canonical ingredient details by unique identifier
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIngredientIdPipe) id: string): Promise<IngredientResponse> {
    return this.ingredientsService.findOne(id);
  }
}
