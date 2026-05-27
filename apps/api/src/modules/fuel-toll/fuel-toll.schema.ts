import { z } from 'zod';
import { parseLocalDateInput } from '../../utils/datePeriod';

const optionalText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);

const idSchema = z.string().min(1, 'Valid ID required');

export const createFuelCardSchema = z.object({
  truckId: idSchema,
  provider: optionalText,
  cardNumber: z.string().trim().min(1, 'Card number is required'),
  displayName: optionalText,
  notes: optionalText,
  isActive: z.boolean().optional().default(true),
});

export const updateFuelCardSchema = createFuelCardSchema.partial();

export const createTollDeviceSchema = z.object({
  truckId: idSchema,
  provider: optionalText,
  deviceNumber: z.string().trim().min(1, 'Device number is required'),
  displayName: optionalText,
  notes: optionalText,
  isActive: z.boolean().optional().default(true),
});

export const updateTollDeviceSchema = createTollDeviceSchema.partial();

const fuelTransactionBaseSchema = z.object({
  fuelCardId: idSchema,
  date: z.string().transform((v) => parseLocalDateInput(v)),
  merchant: optionalText,
  gallons: z.number().min(0).optional(),
  grossAmount: z.number().int().min(1, 'Gross amount must be positive'),
  discount: z.number().int().min(0).optional().default(0),
  reference: optionalText,
  receiptUrl: optionalText,
  notes: optionalText,
});

export const createFuelTransactionSchema = fuelTransactionBaseSchema.superRefine((data, ctx) => {
  if (data.grossAmount - data.discount < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount'],
      message: 'Discount cannot exceed fuel amount',
    });
  }
});

export const updateFuelTransactionSchema = fuelTransactionBaseSchema.partial().superRefine((data, ctx) => {
  if (data.grossAmount != null && data.discount != null && data.grossAmount - data.discount < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount'],
      message: 'Discount cannot exceed fuel amount',
    });
  }
});

export const createTollTransactionSchema = z.object({
  tollDeviceId: idSchema,
  date: z.string().transform((v) => parseLocalDateInput(v)),
  agency: optionalText,
  location: optionalText,
  description: optionalText,
  amount: z.number().int().min(1, 'Amount must be positive'),
  reference: optionalText,
  receiptUrl: optionalText,
  notes: optionalText,
});

export const updateTollTransactionSchema = createTollTransactionSchema.partial();

export type CreateFuelCardInput = z.infer<typeof createFuelCardSchema>;
export type UpdateFuelCardInput = z.infer<typeof updateFuelCardSchema>;
export type CreateTollDeviceInput = z.infer<typeof createTollDeviceSchema>;
export type UpdateTollDeviceInput = z.infer<typeof updateTollDeviceSchema>;
export type CreateFuelTransactionInput = z.infer<typeof createFuelTransactionSchema>;
export type UpdateFuelTransactionInput = z.infer<typeof updateFuelTransactionSchema>;
export type CreateTollTransactionInput = z.infer<typeof createTollTransactionSchema>;
export type UpdateTollTransactionInput = z.infer<typeof updateTollTransactionSchema>;
