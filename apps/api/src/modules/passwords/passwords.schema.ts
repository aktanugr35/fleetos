import { z } from 'zod';

const passwordCategoryEnum = z.enum([
  'PERMITS_TAX',
  'LOAD_BOARDS',
  'COMPLIANCE',
  'EMAIL',
  'OPERATIONS',
  'OTHER',
]);

export const listPasswordsQuerySchema = z.object({
  category: passwordCategoryEnum.optional(),
  search: z.string().optional(),
});

export const createPasswordSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: passwordCategoryEnum.optional(),
  url: z.string().trim().max(500).optional().nullable(),
  username: z.string().trim().max(500).optional().nullable(),
  password: z.string().min(1).max(500),
  notes: z.string().trim().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const updatePasswordSchema = createPasswordSchema.partial().extend({
  password: z.string().min(1).max(500).optional(),
});

export type CreatePasswordInput = z.infer<typeof createPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type ListPasswordsQuery = z.infer<typeof listPasswordsQuerySchema>;
