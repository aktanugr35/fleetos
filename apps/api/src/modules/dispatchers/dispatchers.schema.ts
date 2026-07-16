import { z } from 'zod';

export const createDispatcherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  commissionRate: z.number().int().min(0).max(10000).default(200),
  notes: z.string().optional(),
});

export const updateDispatcherSchema = createDispatcherSchema.partial();

export const dispatcherQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
});

export type CreateDispatcherInput = z.infer<typeof createDispatcherSchema>;
export type UpdateDispatcherInput = z.infer<typeof updateDispatcherSchema>;
export type DispatcherQueryInput = z.infer<typeof dispatcherQuerySchema>;
