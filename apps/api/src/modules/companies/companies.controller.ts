import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { prisma } from '../../config/database';
import { LOGOS_DIR } from '../../config/paths';
import { successResponse } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler.middleware';
import { deleteCompanyLogoFiles, sendLogoFile } from '../../utils/companyLogo';
import { companiesService } from './companies.service';
import { createCompanySchema, updateCompanySchema } from './companies.schema';
import { assertSafeUpload } from '../../utils/upload-type';

function toCompanyResponse(company: { logoUrl?: string | null } & Record<string, unknown>) {
  return {
    ...company,
    hasLogo: Boolean(company.logoUrl),
    logoUrl: company.logoUrl ? '/api/v1/companies/me/logo' : null,
  };
}

export class CompaniesController {
  /** SUPER_ADMIN only — no tenant context */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createCompanySchema.parse(req.body);
      const company = await companiesService.create(input);
      res.status(201).json(successResponse(company));
    } catch (error) {
      next(error);
    }
  }

  /** SUPER_ADMIN only — no tenant context */
  async listAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      });
      res.json(successResponse(companies));
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await prisma.company.findUnique({
        where: { id: req.tenantId! },
      });
      if (!company) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
      res.json(successResponse(toCompanyResponse(company)));
    } catch (error) {
      next(error);
    }
  }

  async getLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await prisma.company.findUnique({
        where: { id: req.tenantId! },
        select: { logoUrl: true },
      });
      if (!company?.logoUrl) {
        throw new AppError(404, 'LOGO_NOT_FOUND', 'No logo uploaded');
      }
      sendLogoFile(res, company.logoUrl);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateCompanySchema.parse(req.body);
      const company = await prisma.company.update({
        where: { id: req.tenantId! },
        data: parsed,
      });
      res.json(successResponse(toCompanyResponse(company)));
    } catch (error) {
      next(error);
    }
  }

  async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(400, 'NO_FILE', 'No logo file was uploaded');
      }

      const tenantId = req.tenantId!;
      const existing = await prisma.company.findUnique({ where: { id: tenantId } });
      if (!existing) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');

      assertSafeUpload(req.file.buffer, true);
      const png = await sharp(req.file.buffer).rotate().png().toBuffer();

      if (!fs.existsSync(LOGOS_DIR)) {
        fs.mkdirSync(LOGOS_DIR, { recursive: true });
      }
      deleteCompanyLogoFiles(tenantId);

      const filename = `company-${tenantId}.png`;
      fs.writeFileSync(path.join(LOGOS_DIR, filename), png);

      const logoUrl = `/uploads/logos/${filename}`;
      const company = await prisma.company.update({
        where: { id: tenantId },
        data: { logoUrl },
      });

      res.json(successResponse(toCompanyResponse(company)));
    } catch (error) {
      next(error);
    }
  }

  async deleteLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const existing = await prisma.company.findUnique({ where: { id: tenantId } });
      if (!existing) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');

      deleteCompanyLogoFiles(tenantId);

      const company = await prisma.company.update({
        where: { id: tenantId },
        data: { logoUrl: null },
      });

      res.json(successResponse(toCompanyResponse(company)));
    } catch (error) {
      next(error);
    }
  }
}

export const companiesController = new CompaniesController();
