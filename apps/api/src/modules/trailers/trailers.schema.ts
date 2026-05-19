import { z } from 'zod';

export const createTrailerSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  vin: z.string().optional(),
  licensePlate: z.string().min(1, 'License plate is required'),
  plateState: z.string().length(2).toUpperCase(),
  dotInspectionExpiry: z.string().transform((v) => new Date(v)).optional(),
  irpExpiry: z.string().transform((v) => new Date(v)).optional(),
});

export const updateTrailerSchema = createTrailerSchema.partial();
export type CreateTrailerInput = z.infer<typeof createTrailerSchema>;
export type UpdateTrailerInput = z.infer<typeof updateTrailerSchema>;
