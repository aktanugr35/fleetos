import { z } from 'zod';
import { DocumentType } from '@haulyard/shared-types';

export const documentTypeSchema = z.nativeEnum(DocumentType);

export const uploadDocumentSchema = z.object({
  type: documentTypeSchema,
  title: z.string().min(1).max(255).optional(),
  driverId: z.string().uuid().optional(),
  truckId: z.string().uuid().optional(),
  trailerId: z.string().uuid().optional(),
  loadId: z.string().uuid().optional(),
  expiryDate: z.coerce.date().optional(),
});

export const listDocumentsSchema = z.object({
  driverId: z.string().uuid().optional(),
  truckId: z.string().uuid().optional(),
  trailerId: z.string().uuid().optional(),
  loadId: z.string().uuid().optional(),
  type: documentTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
