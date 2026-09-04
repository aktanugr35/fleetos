import { z } from 'zod';

export const driverPortalWeeksSchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(8),
});

export type DriverPortalWeeksQuery = z.infer<typeof driverPortalWeeksSchema>;
