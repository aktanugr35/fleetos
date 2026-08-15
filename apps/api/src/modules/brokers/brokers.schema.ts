import { z } from 'zod';

/**
 * Brokers are looked up by MC number while a load is being booked, so the number
 * is always stored digits-only. "MC-123456", "mc 123456" and "123456" all resolve
 * to the same broker.
 */
export function normalizeMcNumber(value: string): string {
  return value.replace(/\D/g, '');
}

const mcNumberField = z
  .string()
  .transform(normalizeMcNumber)
  .refine((v) => v.length >= 3 && v.length <= 12, 'Enter a valid MC number');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const createBrokerSchema = z.object({
  name: z.string().trim().min(1, 'Broker name is required').max(200),
  mcNumber: mcNumberField,
  contactName: optionalText(120),
  phone: optionalText(40),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  address: optionalText(300),
  notes: optionalText(2000),
});

export const updateBrokerSchema = createBrokerSchema.partial();

export const brokerQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export type CreateBrokerInput = z.infer<typeof createBrokerSchema>;
export type UpdateBrokerInput = z.infer<typeof updateBrokerSchema>;
export type BrokerQueryInput = z.infer<typeof brokerQuerySchema>;
