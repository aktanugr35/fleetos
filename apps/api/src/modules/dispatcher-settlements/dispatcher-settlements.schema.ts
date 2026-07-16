import { z } from 'zod';
import { compareCalendarDates, parseLocalDateInput } from '../../utils/datePeriod';

export const createDispatcherSettlementSchema = z.object({
  dispatcherId: z.string().min(1, 'Valid dispatcher ID required'),
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

export const eligibleDispatcherSettlementQuerySchema = z.object({
  dispatcherId: z.string().min(1, 'Valid dispatcher ID required'),
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

export type CreateDispatcherSettlementInput = z.infer<typeof createDispatcherSettlementSchema>;
