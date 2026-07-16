import fs from 'fs';
import { DocumentType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import {
  deleteStoredFile,
  getDocumentSignedDownloadUrl,
  getLocalDocumentPath,
  openDocumentReadStream,
  saveDocumentFile,
} from '../../services/storage.service';

export interface CreateDocumentInput {
  type: DocumentType;
  title: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: Date;
  uploadedById: string;
  driverId?: string;
  truckId?: string;
  trailerId?: string;
  loadId?: string;
}

function withDownloadPath<T extends { id: string }>(doc: T): T & { downloadUrl: string } {
  return {
    ...doc,
    downloadUrl: `/api/v1/documents/${doc.id}/download`,
  };
}

export class DocumentsService {
  async create(tenantId: string, input: CreateDocumentInput) {
    await this.assertEntityLinks(tenantId, input);

    const document = await prisma.document.create({
      data: {
        companyId: tenantId,
        type: input.type,
        title: input.title,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        expiryDate: input.expiryDate,
        uploadedById: input.uploadedById,
        driverId: input.driverId,
        truckId: input.truckId,
        trailerId: input.trailerId,
        loadId: input.loadId,
      },
    });

    return withDownloadPath(document);
  }

  async list(
    tenantId: string,
    filters: {
      driverId?: string;
      truckId?: string;
      trailerId?: string;
      loadId?: string;
      type?: DocumentType;
      page: number;
      limit: number;
    }
  ) {
    const where: Prisma.DocumentWhereInput = { companyId: tenantId };
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.truckId) where.truckId = filters.truckId;
    if (filters.trailerId) where.trailerId = filters.trailerId;
    if (filters.loadId) where.loadId = filters.loadId;
    if (filters.type) where.type = filters.type;

    const skip = (filters.page - 1) * filters.limit;
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.document.count({ where }),
    ]);

    return {
      documents: documents.map(withDownloadPath),
      total,
    };
  }

  async getById(tenantId: string, id: string) {
    const document = await prisma.document.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!document) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
    return withDownloadPath(document);
  }

  async delete(tenantId: string, id: string) {
    const document = await prisma.document.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!document) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');

    await deleteStoredFile(document.fileUrl);
    await prisma.document.delete({ where: { id } });
    return { id };
  }

  async openDownloadStream(fileUrl: string) {
    return openDocumentReadStream(fileUrl);
  }

  async resolveDownload(tenantId: string, id: string) {
    const document = await prisma.document.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!document) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');

    const signedUrl = await getDocumentSignedDownloadUrl(document.fileUrl);
    if (signedUrl) {
      return { kind: 'redirect' as const, url: signedUrl, document };
    }

    const filePath = getLocalDocumentPath(document.fileUrl);
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'Document file is missing on disk');
    }

    return { kind: 'file' as const, filePath, document };
  }

  async saveUploadedFile(
    tenantId: string,
    filename: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    return saveDocumentFile(tenantId, filename, buffer, mimeType);
  }

  private async assertEntityLinks(tenantId: string, input: CreateDocumentInput) {
    if (input.driverId) {
      const driver = await prisma.driver.findFirst({
        where: { id: input.driverId, companyId: tenantId },
      });
      if (!driver) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');
    }
    if (input.truckId) {
      const truck = await prisma.truck.findFirst({
        where: { id: input.truckId, companyId: tenantId },
      });
      if (!truck) throw new AppError(404, 'TRUCK_NOT_FOUND', 'Truck not found');
    }
    if (input.trailerId) {
      const trailer = await prisma.trailer.findFirst({
        where: { id: input.trailerId, companyId: tenantId },
      });
      if (!trailer) throw new AppError(404, 'TRAILER_NOT_FOUND', 'Trailer not found');
    }
    if (input.loadId) {
      const load = await prisma.load.findFirst({
        where: { id: input.loadId, companyId: tenantId },
      });
      if (!load) throw new AppError(404, 'LOAD_NOT_FOUND', 'Load not found');
    }
  }
}

export const documentsService = new DocumentsService();
