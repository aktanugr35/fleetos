import crypto from 'crypto';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { env } from '../../config/env';
import { documentsService } from '../documents/documents.service';
import { driverIntakeFormSchema, type DriverIntakeFormInput } from './driver-intake.schema';
import { driverIntakePdfService } from './driver-intake-pdf.service';

const TOKEN_TTL_DAYS = 30;

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

  async getIntakeStatus(tenantId: string, driverId: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId },
      select: { id: true },
    });
    if (!driver) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');

    const [activeToken, applicationDoc] = await Promise.all([
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
    ]);

    return {
      submitted: Boolean(applicationDoc),
      submittedAt: applicationDoc?.createdAt ?? null,
      documentId: applicationDoc?.id ?? null,
      pendingLink: activeToken
        ? {
            url: this.buildPublicUrl(activeToken.token),
            expiresAt: activeToken.expiresAt,
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
      data: { usedAt: new Date() },
    });

    return { success: true };
  }
}

export const driverIntakeService = new DriverIntakeService();
