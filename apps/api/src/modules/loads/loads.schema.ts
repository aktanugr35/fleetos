import { z } from 'zod';
import { LoadStatus } from '@fleetos/shared-types';

const loadStatusEnum = z.nativeEnum(LoadStatus);

export const createLoadSchema = z.object({
  driverId: z.string().min(1, 'Valid driver ID required'),
  bookedByDispatcherId: z.string().min(1, 'Booked by dispatcher is required'),
  truckId: z.string().min(1, 'Valid truck ID required'),
  trailerId: z.string().optional().nullable(),
  /** Hook & drop / external trailer label when not using company trailer */
  externalTrailerRef: z.string().max(120).optional().nullable(),
  loadNumber: z.string().optional(),
  brokerName: z.string().min(1, 'Broker name is required'),
  brokerMC: z.string().optional(),
  brokerContact: z.string().optional(),
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  pickupCity: z.string().min(1, 'Pickup city is required'),
  pickupState: z.string().length(2).toUpperCase(),
  pickupDate: z.string().transform((v) => new Date(v)),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  deliveryCity: z.string().min(1, 'Delivery city is required'),
  deliveryState: z.string().length(2).toUpperCase(),
  deliveryDate: z.string().transform((v) => new Date(v)),
  commodity: z.string().optional(),
  weight: z.number().int().optional(),
  loadedMiles: z.number().int().min(0).optional().default(0),
  deadheadMiles: z.number().int().min(0).optional().default(0),
  rateCents: z.number().int().min(1, 'Rate is required'),
  rateType: z.enum(['FLAT', 'PER_MILE']).default('FLAT'),
  detentionCents: z.number().int().optional().default(0),
  lumperCents: z.number().int().optional().default(0),
  otherChargesCents: z.number().int().optional().default(0),
  status: loadStatusEnum.optional(),
  actualDeliveryDate: z.string().transform((v) => new Date(v)).optional(),
  notes: z.string().optional(),
  rateConfirmationDocumentId: z.string().optional(),
});

export const updateLoadSchema = createLoadSchema.partial().extend({
  status: loadStatusEnum.optional(),
  actualDeliveryDate: z.string().transform((v) => new Date(v)).optional(),
});

export const loadQuerySchema = z.object({
  status: loadStatusEnum.optional(),
  driverId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export type CreateLoadInput = z.infer<typeof createLoadSchema>;
export type UpdateLoadInput = z.infer<typeof updateLoadSchema>;
export type LoadQueryInput = z.infer<typeof loadQuerySchema>;
