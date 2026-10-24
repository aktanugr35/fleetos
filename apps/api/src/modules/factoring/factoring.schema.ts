import { z } from 'zod';

export const factoringListQuerySchema = z.object({
  /**
   * `open` = not submitted yet, `submitted` = already sent to factoring / in-house finance,
   * `fees` = loads with a factoring fee entered.
   */
  view: z.enum(['open', 'submitted', 'all', 'fees']).default('open'),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const submitBillingSchema = z.object({
  method: z.enum(['FACTORING', 'IN_HOUSE']),
});

/** `null` clears the fee. */
export const updateFeeSchema = z.object({
  feeCents: z.number().int().min(0).max(100_000_000).nullable(),
});

export type FactoringListQuery = z.infer<typeof factoringListQuerySchema>;
