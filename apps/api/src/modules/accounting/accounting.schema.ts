import { z } from 'zod';
import { accountingCategories, PAYMENT_METHODS } from '@haulyard/shared-types';

/** Calendar day entered in the form, stored as UTC midnight so it never shifts a day. */
export function parseEntryDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(Date.UTC(y, m, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) return null;
  return date;
}

const day = z.string().transform((value, ctx) => {
  const date = parseEntryDay(value);
  if (!date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use a valid YYYY-MM-DD date' });
    return z.NEVER;
  }
  return date;
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

export const accountingEntrySchema = z
  .object({
    kind: z.enum(['EXPENSE', 'INCOME']),
    category: z.string().trim().min(1),
    date: day,
    amount: z.number().int().min(1).max(1_000_000_000),
    vendor: optionalText(120),
    description: optionalText(500),
    paymentMethod: z
      .string()
      .nullish()
      .transform((value) => (value ? value : null))
      .refine((value) => value === null || PAYMENT_METHODS.some((m) => m.key === value), 'Unknown payment method'),
    reference: optionalText(100),
    truckId: z
      .string()
      .uuid()
      .nullish()
      .or(z.literal(''))
      .transform((value) => (value ? value : null)),
  })
  .superRefine((input, ctx) => {
    if (!accountingCategories(input.kind).some((c) => c.key === input.category)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['category'], message: 'Unknown category' });
    }
  });

export const accountingListQuerySchema = z.object({
  kind: z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
  category: z.string().trim().optional(),
  truckId: z.string().uuid().optional(),
  from: day.optional(),
  to: day.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AccountingEntryInput = z.infer<typeof accountingEntrySchema>;
export type AccountingListQuery = z.infer<typeof accountingListQuerySchema>;
