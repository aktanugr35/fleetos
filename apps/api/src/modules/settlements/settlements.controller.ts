import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { settlementsService } from './settlements.service';
import { pdfService } from './pdf.service';
import { createSettlementSchema, eligibleSettlementQuerySchema } from './settlements.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';
import { assertDriverOwnsSettlement, assertDriverQueryScoped } from '../../utils/driverScope';

export class SettlementsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      let driverId = req.query.driverId as string | undefined;
      if (req.user?.role === 'DRIVER') {
        assertDriverQueryScoped(req, driverId);
        driverId = req.linkedDriverId;
      }
      const { settlements, total } = await settlementsService.list(req.tenantId!, driverId, page, limit);
      res.json(successResponse(settlements, buildPaginationMeta(total, { page, limit, skip: (page - 1) * limit })));
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await settlementsService.getById(req.tenantId!, req.params.id as string);
      assertDriverOwnsSettlement(req, settlement.driverId);
      res.json(successResponse(settlement));
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createSettlementSchema.parse(req.body);
      const result = await settlementsService.create(req.tenantId!, input);
      res.status(201).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await settlementsService.approve(req.tenantId!, req.params.id as string);
      res.json(successResponse(settlement));
    } catch (error) { next(error); }
  }

  async markPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await settlementsService.markPaid(req.tenantId!, req.params.id as string);
      res.json(successResponse(settlement));
    } catch (error) { next(error); }
  }

  async getEligible(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = { ...(req.query as Record<string, unknown>) };
      if (req.user?.role === 'DRIVER') {
        assertDriverQueryScoped(req, req.query.driverId as string | undefined);
        raw.driverId = req.linkedDriverId;
      }
      const query = eligibleSettlementQuerySchema.parse(raw);
      const data = await settlementsService.getEligible(
        req.tenantId!,
        query.driverId,
        query.weekStartDate,
        query.weekEndDate
      );
      res.json(successResponse(data));
    } catch (error) { next(error); }
  }
  async generatePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const settlementId = req.params.id as string;
      const pdfUrl = await pdfService.generateSettlementPdf(settlementId, req.tenantId!);
      res.json(successResponse({ pdfUrl, settlementId }));
    } catch (error) {
      next(error);
    }
  }

  async streamPdf(req: Request, res: Response, next: NextFunction) {
    return this.downloadPdf(req, res, next);
  }

  async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await settlementsService.getById(req.tenantId!, req.params.id as string);
      assertDriverOwnsSettlement(req, settlement.driverId);
      const { filepath, filename } = await pdfService.getSettlementPdfFile(
        req.params.id as string,
        req.tenantId!
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const stream = fs.createReadStream(filepath);
      stream.on('error', next);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

export const settlementsController = new SettlementsController();
