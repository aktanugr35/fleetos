import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
  dotNumber: z.string().min(1).max(32),
  mcNumber: z.string().min(1).max(32),
  address: z.string().max(500).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
  defaultOOCommissionRate: z.coerce.number().int().min(0).max(10000).optional(),
  weeklyCompanyFee: z.coerce.number().int().min(0).optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  defaultOOCommissionRate: z.coerce.number().int().min(0).max(10000).optional(),
  weeklyCompanyFee: z.coerce.number().int().min(0).optional(),
});
