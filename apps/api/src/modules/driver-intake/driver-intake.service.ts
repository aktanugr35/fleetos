import crypto from 'crypto';
import sharp from 'sharp';
import { DocumentType } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { env } from '../../config/env';
import { documentsService } from '../documents/documents.service';
import { driverIntakeFormSchema, type DriverIntakeFormInput } from './driver-intake.schema';
import { driverIntakePdfService } from './driver-intake-pdf.service';

const TOKEN_TTL_DAYS = 30;

export type IntakeDocCategory =
  | 'driverLicenseFront'
  | 'driverLicenseBack'
  | 'medicalCard'
  | 'passport'
  | 'workAuthorization';

export const REQUIRED_INTAKE_DOCUMENTS: {
  category: IntakeDocCategory;
  type: DocumentType;
  title: string;
}[] = [
  { category: 'driverLicenseFront', type: DocumentType.DRIVER_LICENSE_FRONT, title: "Driver's License (Front)" },
  { category: 'driverLicenseBack', type: DocumentType.DRIVER_LICENSE_BACK, title: "Driver's License (Back)" },
  { category: 'medicalCard', type: DocumentType.MEDICAL_CARD, title: 'Medical Card' },
  { category: 'passport', type: DocumentType.PASSPORT, title: 'Passport' },
  { category: 'workAuthorization', type: DocumentType.WORK_AUTHORIZATION, title: 'Work Authorization' },
];

export interface UploadedIntakeFile {
  category: IntakeDocCategory;
  buffer: Buffer;
}

export class DriverIntakeService {
  buildPublicUrl(token: string): string {
    const base = env.FRONTEND_URL.replace(/\/$/, '');
    return `${base}/driver-application/${token}`;
  }

  async createIntakeLink(tenantId: string, driverId: string, createdById: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId, isActive: true },
    });
    if (!driver) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');

    await prisma.driverIntakeToken.updateMany({
      where: { driverId, companyId: tenantId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

    const record = await prisma.driverIntakeToken.create({
      data: {
        companyId: tenantId,
        driverId,
        token,
        createdById,
        expiresAt,
      },
    });

    return {
      token: record.token,
      url: this.buildPublicUrl(record.token),
      expiresAt: record.expiresAt,
    };
  }

  private intakeDocumentTypes(): DocumentType[] {
    return [
      DocumentType.DRIVER_APPLICATION,
      ...REQUIRED_INTAKE_DOCUMENTS.map((d) => d.type),
    ];
  }

  /** Delete all intake PDF/photo documents and issue a fresh application link. */
  async resetIntake(tenantId: string, driverId: string, createdById: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId },
    });
    if (!driver) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');

    const docs = await prisma.document.findMany({
      where: { driverId, companyId: tenantId, type: { in: this.intakeDocumentTypes() } },
      select: { id: true },
    });

    for (const doc of docs) {
      await documentsService.delete(tenantId, doc.id).catch(() => undefined);
    }

    await prisma.driverIntakeToken.updateMany({
      where: { driverId, companyId: tenantId, usedAt: null },
      data: { usedAt: new Date() },
    });

    return this.createIntakeLink(tenantId, driverId, createdById);
  }

  async getIntakeStatus(tenantId: string, driverId: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId },
      select: { id: true },
    });
    if (!driver) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');

    const intakeTypes: DocumentType[] = [
      DocumentType.DRIVER_APPLICATION,
      DocumentType.DRIVER_LICENSE_FRONT,
      DocumentType.DRIVER_LICENSE_BACK,
      DocumentType.MEDICAL_CARD,
      DocumentType.PASSPORT,
      DocumentType.WORK_AUTHORIZATION,
    ];

    const [activeToken, applicationDoc, intakeDocs] = await Promise.all([
      prisma.driverIntakeToken.findFirst({
        where: {
          driverId,
          companyId: tenantId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.findFirst({
        where: { driverId, companyId: tenantId, type: 'DRIVER_APPLICATION' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.findMany({
        where: { driverId, companyId: tenantId, type: { in: intakeTypes } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, title: true, mimeType: true, createdAt: true },
      }),
    ]);

    return {
      submitted: Boolean(applicationDoc),
      submittedAt: applicationDoc?.createdAt ?? null,
      documentId: applicationDoc?.id ?? null,
      documents: intakeDocs,
      pendingLink: activeToken
        ? {
            url: this.buildPublicUrl(activeToken.token),
            expiresAt: activeToken.expiresAt,
            formSubmitted: Boolean(activeToken.formSubmittedAt),
          }
        : null,
    };
  }

  private async resolveToken(token: string) {
    const record = await prisma.driverIntakeToken.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            dotNumber: true,
            address: true,
            phone: true,
            email: true,
            logoUrl: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!record) {
      throw new AppError(404, 'INTAKE_NOT_FOUND', 'Application link is invalid');
    }
    if (record.usedAt) {
      throw new AppError(410, 'INTAKE_ALREADY_USED', 'This application link has already been used');
    }
    if (record.expiresAt < new Date()) {
      throw new AppError(410, 'INTAKE_EXPIRED', 'This application link has expired');
    }

    return record;
  }

  async getPublicContext(token: string) {
    const record = await this.resolveToken(token);
    return {
      company: record.company,
      driverHint: {
        firstName: record.driver.firstName,
        lastName: record.driver.lastName,
        email: record.driver.email,
        phone: record.driver.phone,
      },
      formSubmitted: Boolean(record.formSubmittedAt),
      requiredDocuments: REQUIRED_INTAKE_DOCUMENTS.map((d) => ({
        category: d.category,
        title: d.title,
      })),
      expiresAt: record.expiresAt,
    };
  }

  async submitPublicForm(token: string, rawBody: unknown) {
    const record = await this.resolveToken(token);
    const form = driverIntakeFormSchema.parse(rawBody);

    const pdfBuffer = await driverIntakePdfService.generatePdfBuffer(record.company, form);
    const filename = `driver_application_${record.driverId}_${Date.now()}.pdf`;
    const fileUrl = await documentsService.saveUploadedFile(
      record.companyId,
      filename,
      pdfBuffer,
      'application/pdf',
    );

    // Replace any prior application PDF so we keep only the latest submission.
    const existing = await prisma.document.findMany({
      where: { driverId: record.driverId, companyId: record.companyId, type: 'DRIVER_APPLICATION' },
      select: { id: true },
    });
    for (const doc of existing) {
      await documentsService.delete(record.companyId, doc.id).catch(() => undefined);
    }

    await documentsService.create(record.companyId, {
      type: 'DRIVER_APPLICATION',
      title: 'Driver Application for DOT Certification',
      fileUrl,
      fileSize: pdfBuffer.length,
      mimeType: 'application/pdf',
      driverId: record.driverId,
      uploadedById: record.createdById,
    });

    await prisma.driver.update({
      where: { id: record.driverId },
      data: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.telephone,
        cdlNumber: form.licenseNumber,
        cdlState: form.licenseState.toUpperCase(),
        cdlExpiryDate: new Date(form.licenseExpiration),
        address: form.residency[0]?.street,
        city: form.residency[0]?.city,
        state: form.residency[0]?.state.toUpperCase(),
        zip: form.residency[0]?.zip,
      },
    });

    await prisma.driverIntakeToken.update({
      where: { id: record.id },
      data: { formSubmittedAt: new Date() },
    });

    return { success: true, nextStep: 'documents' as const };
  }

  async submitDocuments(token: string, files: UploadedIntakeFile[]) {
    const record = await this.resolveToken(token);

    if (!record.formSubmittedAt) {
      throw new AppError(400, 'FORM_NOT_SUBMITTED', 'Complete the application form before uploading documents');
    }

    const byCategory = new Map<IntakeDocCategory, Buffer>();
    for (const file of files) {
      byCategory.set(file.category, file.buffer);
    }

    const missing = REQUIRED_INTAKE_DOCUMENTS.filter((d) => !byCategory.get(d.category)?.length);
    if (missing.length > 0) {
      throw new AppError(
        400,
        'MISSING_DOCUMENTS',
        `Missing required photos: ${missing.map((d) => d.title).join(', ')}`,
      );
    }

    // Remove any prior intake photos so re-submission keeps a single clean set.
    const priorDocs = await prisma.document.findMany({
      where: {
        driverId: record.driverId,
        companyId: record.companyId,
        type: { in: REQUIRED_INTAKE_DOCUMENTS.map((d) => d.type) },
      },
      select: { id: true },
    });
    for (const doc of priorDocs) {
      await documentsService.delete(record.companyId, doc.id).catch(() => undefined);
    }

    for (const def of REQUIRED_INTAKE_DOCUMENTS) {
      const raw = byCategory.get(def.category)!;
      const png = await sharp(raw).rotate().png({ quality: 90 }).toBuffer();
      const filename = `${def.type.toLowerCase()}_${record.driverId}_${Date.now()}.png`;
      const fileUrl = await documentsService.saveUploadedFile(
        record.companyId,
        filename,
        png,
        'image/png',
      );
      await documentsService.create(record.companyId, {
        type: def.type,
        title: def.title,
        fileUrl,
        fileSize: png.length,
        mimeType: 'image/png',
        driverId: record.driverId,
        uploadedById: record.createdById,
      });
    }

    await prisma.driverIntakeToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return { success: true };
  }
}

export const driverIntakeService = new DriverIntakeService();
