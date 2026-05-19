import { z } from 'zod';

const driverTypeEnum = z.enum(['COMPANY_DRIVER', 'OWNER_OPERATOR']);
const payStructureEnum = z.enum(['PER_MILE', 'FIXED_SALARY', 'PERCENTAGE']);

export const createDriverSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  driverType: driverTypeEnum,
  payStructure: payStructureEnum,
  payRate: z.number().int().min(0, 'Pay rate must be positive'),
  cdlNumber: z.string().min(1, 'CDL number is required'),
  cdlState: z.string().length(2, 'State must be 2 characters').toUpperCase(),
  cdlExpiryDate: z.string().transform((v) => new Date(v)),
  medicalCardExpiry: z.string().transform((v) => new Date(v)),
  notes: z.string().optional(),
  llcName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zip: z.string().optional(),
  /** Driver deposit / escrow held by company (cents) */
  escrowBalance: z.number().int().min(0).optional().default(0),
});

export const updateDriverSchema = createDriverSchema.partial();

export const driverQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  type: driverTypeEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type DriverQueryInput = z.infer<typeof driverQuerySchema>;
