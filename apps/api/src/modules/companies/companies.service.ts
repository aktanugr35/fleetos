import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { createCompanySchema } from './companies.schema';
import type { z } from 'zod';

type CreateCompanyInput = z.infer<typeof createCompanySchema>;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'company';
}

export class CompaniesService {
  async create(input: CreateCompanyInput) {
    let slug = slugify(input.name);

    const [existingSlug, existingDot, existingMc] = await Promise.all([
      prisma.company.findUnique({ where: { slug } }),
      prisma.company.findUnique({ where: { dotNumber: input.dotNumber.trim() } }),
      prisma.company.findUnique({ where: { mcNumber: input.mcNumber.trim() } }),
    ]);

    if (existingDot) {
      throw new AppError(409, 'DOT_EXISTS', 'A company with this DOT number already exists');
    }
    if (existingMc) {
      throw new AppError(409, 'MC_EXISTS', 'A company with this MC number already exists');
    }
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    return prisma.company.create({
      data: {
        name: input.name.trim(),
        slug,
        dotNumber: input.dotNumber.trim(),
        mcNumber: input.mcNumber.trim(),
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        defaultOOCommissionRate: input.defaultOOCommissionRate ?? 1200,
        weeklyCompanyFee: input.weeklyCompanyFee ?? 0,
      },
    });
  }
}

export const companiesService = new CompaniesService();
