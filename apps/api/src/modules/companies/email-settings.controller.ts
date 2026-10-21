import { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { successResponse } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler.middleware';
import { emailSettingsService } from './email-settings.service';
import { testEmailSchema, upsertEmailSettingsSchema } from './email-settings.schema';

/** Surfaces the first field error so the settings form can show it even in production. */
function parseOrThrow<S extends ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', result.error.issues[0]?.message ?? 'Invalid email settings');
  }
  return result.data;
}

export const emailSettingsController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(successResponse(await emailSettingsService.get(req.tenantId!)));
    } catch (error) { next(error); }
  },

  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parseOrThrow(upsertEmailSettingsSchema, req.body);
      res.json(successResponse(await emailSettingsService.upsert(req.tenantId!, input)));
    } catch (error) { next(error); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(successResponse(await emailSettingsService.remove(req.tenantId!)));
    } catch (error) { next(error); }
  },

  async sendTest(req: Request, res: Response, next: NextFunction) {
    try {
      const { to } = parseOrThrow(testEmailSchema, req.body);
      res.json(successResponse(await emailSettingsService.sendTest(req.tenantId!, to)));
    } catch (error) { next(error); }
  },
};
