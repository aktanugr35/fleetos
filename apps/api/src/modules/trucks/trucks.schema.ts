import { z } from 'zod';

export const createTruckSchema = z.object({
  ownerDriverId: z.string().optional().nullable(),
  unitNumber: z.string().min(1, 'Unit number is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  vin: z.string().min(11, 'VIN must be at least 11 characters').max(17),
  licensePlate: z.string().min(1, 'License plate is required'),
  plateState: z.string().length(2).toUpperCase(),
  dotInspectionExpiry: z.string().transform((v) => new Date(v)),
  irpExpiry: z.string().transform((v) => new Date(v)),
  hvutExpiry: z.string().transform((v) => new Date(v)),
  insuranceExpiry: z.string().transform((v) => new Date(v)),
  notes: z.string().optional(),
});

export const updateTruckSchema = createTruckSchema.partial();

export type CreateTruckInput = z.infer<typeof createTruckSchema>;
export type UpdateTruckInput = z.infer<typeof updateTruckSchema>;
