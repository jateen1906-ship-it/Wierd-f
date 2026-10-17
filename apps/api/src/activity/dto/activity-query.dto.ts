import { z } from 'zod';

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['all', 'root_experiment', 'remix', 'cooking_result']).default('all'),
});

export type ActivityQueryDto = z.infer<typeof activityQuerySchema>;
