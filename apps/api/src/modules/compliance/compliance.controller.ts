import { Request, Response, NextFunction } from 'express';
import { complianceService } from './compliance.service';
import { successResponse } from '../../utils/pagination';
import { COMPLIANCE_CATEGORIES } from './compliance.catalog';
import {
  listComplianceSchema,
  entityRecordsSchema,
  upsertRecordSchema,
  markNaSchema,
  updateSettingSchema,
} from './compliance.schema';

export class ComplianceController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await complianceService.getOverview(req.tenantId!);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listComplianceSchema.parse(req.query);
      const result = await complianceService.list(req.tenantId!, filters);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  async getEntityRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = entityRecordsSchema.parse(req.params);
      const items = await complianceService.getEntityRecords(req.tenantId!, entityType, entityId);
      res.json(successResponse({ items }));
    } catch (error) {
      next(error);
    }
  }

  async upsertRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const input = upsertRecordSchema.parse(req.body);
      const record = await complianceService.upsertRecord(req.tenantId!, req.user?.userId, input);
      res.status(201).json(successResponse(record));
    } catch (error) {
      next(error);
    }
  }

  async markNotApplicable(req: Request, res: Response, next: NextFunction) {
    try {
      const input = markNaSchema.parse(req.body);
      const record = await complianceService.markNotApplicable(req.tenantId!, req.user?.userId, input);
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  }

  async getRecordHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await complianceService.getRecordHistory(req.tenantId!, req.params.id as string);
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  }

  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await complianceService.getSettings(req.tenantId!);
      res.json(successResponse({ settings, categories: COMPLIANCE_CATEGORIES }));
    } catch (error) {
      next(error);
    }
  }

  async updateSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateSettingSchema.parse(req.body);
      const setting = await complianceService.updateSetting(
        req.tenantId!,
        req.params.typeId as string,
        data,
      );
      res.json(successResponse(setting));
    } catch (error) {
      next(error);
    }
  }
}

export const complianceController = new ComplianceController();
