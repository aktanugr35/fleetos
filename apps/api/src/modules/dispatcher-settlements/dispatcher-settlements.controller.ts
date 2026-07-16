import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { dispatcherSettlementsService } from './dispatcher-settlements.service';
import { dispatcherPdfService } from './dispatcher-pdf.service';
import {
  createDispatcherSettlementSchema,
  eligibleDispatcherSettlementQuerySchema,
} from './dispatcher-settlements.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';

export class DispatcherSettlementsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const dispatcherId = req.query.dispatcherId as string | undefined;
      const { settlements, total } = await dispatcherSettlementsService.list(
        req.tenantId!,
        dispatcherId,
        page,
        limit,
      );
      res.json(successResponse(settlements, buildPaginationMeta(total, { page, limit, skip: (page - 1) * limit })));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await dispatcherSettlementsService.getById(req.tenantId!, req.params.id as string);
      res.json(successResponse(settlement));
    } catch (error) {
      next(error);
    }
  }

  async getEligible(req: Request, res: Response, next: NextFunction) {
    try {
      const query = eligibleDispatcherSettlementQuerySchema.parse(req.query);
      const data = await dispatcherSettlementsService.getEligible(
        req.tenantId!,
        query.dispatcherId,
        query.weekStartDate,
        query.weekEndDate,
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createDispatcherSettlementSchema.parse(req.body);
      const result = await dispatcherSettlementsService.create(req.tenantId!, input);
      res.status(201).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await dispatcherSettlementsService.approve(req.tenantId!, req.params.id as string);
      res.json(successResponse(settlement));
    } catch (error) {
      next(error);
    }
  }

  async markPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await dispatcherSettlementsService.markPaid(req.tenantId!, req.params.id as string);
      res.json(successResponse(settlement));
    } catch (error) {
      next(error);
    }
  }

  async generatePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const pdfUrl = await dispatcherPdfService.generatePdf(req.params.id as string, req.tenantId!);
      res.json(successResponse({ pdfUrl, settlementId: req.params.id }));
    } catch (error) {
      next(error);
    }
  }

  async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { filepath, filename } = await dispatcherPdfService.getPdfFile(
        req.params.id as string,
        req.tenantId!,
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

export const dispatcherSettlementsController = new DispatcherSettlementsController();
