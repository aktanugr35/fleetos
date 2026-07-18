import { z } from 'zod';

const entityType = z.enum(['DRIVER', 'TRUCK', 'TRAILER', 'COMPANY']);
const status = z.enum(['VALID', 'DUE_SOON', 'EXPIRED', 'MISSING', 'NA']);
const dateInput = z.string().transform((v) => new Date(v));

export const listComplianceSchema = z.object({
  entityType: entityType.optional(),
  category: z.string().optional(),
  status: status.optional(),
  typeKey: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const entityRecordsSchema = z.object({
  entityType,
  entityId: z.string(),
});

export const upsertRecordSchema = z
  .object({
    complianceTypeId: z.string().optional(),
    typeKey: z.string().optional(),
    entityType,
    entityId: z.string().optional().nullable(),
    expiryDate: dateInput.optional().nullable(),
    completedAt: dateInput.optional().nullable(),
    issuedDate: dateInput.optional().nullable(),
    referenceNumber: z.string().max(120).optional().nullable(),
    documentId: z.string().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((d) => d.complianceTypeId || d.typeKey, {
    message: 'complianceTypeId or typeKey is required',
  });

export const markNaSchema = z
  .object({
    complianceTypeId: z.string().optional(),
    typeKey: z.string().optional(),
    entityType,
    entityId: z.string().optional().nullable(),
  })
  .refine((d) => d.complianceTypeId || d.typeKey, {
    message: 'complianceTypeId or typeKey is required',
  });

export const updateSettingSchema = z.object({
  enabled: z.boolean().optional(),
  cadenceMonths: z.number().int().min(1).max(120).nullable().optional(),
  reminderDays: z.array(z.number().int().min(0).max(365)).max(10).optional(),
});

export type ListComplianceInput = z.infer<typeof listComplianceSchema>;
export type UpsertRecordInput = z.infer<typeof upsertRecordSchema>;
export type MarkNaInput = z.infer<typeof markNaSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
