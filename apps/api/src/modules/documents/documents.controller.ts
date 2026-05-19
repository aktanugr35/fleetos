import crypto from 'crypto';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { documentsService } from './documents.service';
import { listDocumentsSchema, uploadDocumentSchema } from './documents.schema';
import { successResponse, buildPaginationMeta } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler.middleware';

export class DocumentsController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(400, 'NO_FILE', 'No file was uploaded');
      }

      const body = uploadDocumentSchema.parse(req.body);
      const tenantId = req.tenantId!;
      const filename = `${crypto.randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;
      const fileUrl = await documentsService.saveUploadedFile(
        tenantId,
        filename,
        req.file.buffer,
        req.file.mimetype
      );

      const document = await documentsService.create(tenantId, {
        type: body.type,
        title: body.title || req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        expiryDate: body.expiryDate,
        uploadedById: req.user!.userId,
        driverId: body.driverId,
        truckId: body.truckId,
        trailerId: body.trailerId,
        loadId: body.loadId,
      });

      res.status(201).json(successResponse(document));
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = listDocumentsSchema.parse(req.query);
      const { documents, total } = await documentsService.list(req.tenantId!, parsed);
      const meta = buildPaginationMeta(total, {
        page: parsed.page,
        limit: parsed.limit,
        skip: (parsed.page - 1) * parsed.limit,
      });
      res.json(successResponse(documents, meta));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await documentsService.getById(req.tenantId!, req.params.id as string);
      res.json(successResponse(document));
    } catch (error) {
      next(error);
    }
  }

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await documentsService.resolveDownload(
        req.tenantId!,
        req.params.id as string
      );

      if (result.kind === 'redirect') {
        return res.redirect(result.url);
      }

      const filename = result.document.title.replace(/[^\w.-]+/g, '_') || 'document';
      res.setHeader('Content-Type', result.document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      return res.sendFile(result.filePath);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await documentsService.delete(req.tenantId!, req.params.id as string);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
}

export const documentsController = new DocumentsController();
