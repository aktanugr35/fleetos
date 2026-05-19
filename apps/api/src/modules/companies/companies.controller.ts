import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { prisma } from '../../config/database';
import { successResponse } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler.middleware';
import { deleteCompanyLogoFiles, resolveLogoFilePath } from '../../utils/companyLogo';
import { companiesService } from './companies.service';
import { createCompanySchema, updateCompanySchema } from './companies.schema';

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
      res.json(successResponse(company));
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
      res.json(successResponse(company));
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

      if (existing.logoUrl) {
        const oldPath = resolveLogoFilePath(existing.logoUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const logoUrl = `/uploads/logos/${req.file.filename}`;
      const company = await prisma.company.update({
        where: { id: tenantId },
        data: { logoUrl },
      });

      res.json(successResponse(company));
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

      res.json(successResponse(company));
    } catch (error) {
      next(error);
    }
  }
}

export const companiesController = new CompaniesController();
