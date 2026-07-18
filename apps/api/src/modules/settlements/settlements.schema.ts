import { z } from 'zod';
import { CreditType, DeductionType } from '@haulyard/shared-types';
import { compareCalendarDates, parseLocalDateInput } from '../../utils/datePeriod';

export const createSettlementSchema = z.object({
  driverId: z.string().min(1, 'Valid driver ID required'),
  weekStartDate: z.string().transform((v) => parseLocalDateInput(v)),
  weekEndDate: z.string().transform((v) => parseLocalDateInput(v)),
  loadIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (compareCalendarDates(data.weekEndDate, data.weekStartDate) < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Period end must be on or after period start',
      path: ['weekEndDate'],
    });
  }
});

export const eligibleSettlementQuerySchema = z.object({
  driverId: z.string().min(1, 'Valid driver ID required'),
  weekStartDate: z.string().transform((v) => parseLocalDateInput(v)),
  weekEndDate: z.string().transform((v) => parseLocalDateInput(v)),
}).superRefine((data, ctx) => {
  if (compareCalendarDates(data.weekEndDate, data.weekStartDate) < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Period end must be on or after period start',
      path: ['weekEndDate'],
    });
  }
});

const fuelMetadataSchema = z.object({
  merchant: z.string().optional(),
  gallons: z.number().min(0).optional(),
  discountCents: z.number().int().min(0).optional(),
  grossAmountCents: z.number().int().min(1).optional(),
});

const createDeductionBaseSchema = z.object({
  driverId: z.string().min(1, 'Valid driver ID required'),
  type: z.nativeEnum(DeductionType),
  description: z.string().min(1, 'Description is required'),
  /** Net deduction in cents (for fuel: gross − discount) */
  amount: z.number().int().min(1, 'Amount must be positive'),
  isRecurring: z.boolean().optional().default(false),
  date: z.string().transform((v) => parseLocalDateInput(v)).optional(),
  metadata: fuelMetadataSchema.optional(),
});

export const createDeductionSchema = createDeductionBaseSchema.superRefine((data, ctx) => {
  if (data.type === 'FUEL' && data.metadata?.grossAmountCents != null) {
    const discount = data.metadata.discountCents ?? 0;
    if (data.metadata.grossAmountCents - discount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Discount cannot exceed fuel amount',
        path: ['metadata', 'discountCents'],
      });
    }
  }
});

export const updateDeductionSchema = createDeductionBaseSchema.partial();

export const createCreditSchema = z.object({
  driverId: z.string().min(1, 'Valid driver ID required'),
  type: z.nativeEnum(CreditType),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().int().min(1, 'Amount must be positive'),
  isRecurring: z.boolean().optional().default(false),
  date: z.string().transform((v) => parseLocalDateInput(v)).optional(),
});

export const updateCreditSchema = createCreditSchema.partial();

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type CreateDeductionInput = z.infer<typeof createDeductionSchema>;
export type CreateCreditInput = z.infer<typeof createCreditSchema>;
