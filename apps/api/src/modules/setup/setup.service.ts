import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { authService } from '../auth/auth.service';
import { logger } from '../../utils/logger';
import type { SetupInput } from './setup.schema';

const BCRYPT_ROUNDS = 12;

export function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'company';
}

export class SetupService {
  async isSetupRequired(): Promise<boolean> {
    const userCount = await prisma.user.count();
    return userCount === 0;
  }

  async bootstrap(input: SetupInput) {
    const required = await this.isSetupRequired();
    if (!required) {
      throw new AppError(403, 'SETUP_COMPLETE', 'System setup has already been completed');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    let slug = slugifyCompanyName(input.companyName);

    const existingSlug = await prisma.company.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const { company, user } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: input.companyName,
          slug,
          dotNumber: input.dotNumber.trim(),
          mcNumber: input.mcNumber.trim(),
          address: input.companyAddress?.trim() || null,
          phone: input.companyPhone?.trim() || null,
          email: input.email,
        },
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: UserRole.COMPANY_ADMIN,
          companyId: company.id,
        },
        include: { company: true },
      });

      return { company, user };
    });

    logger.info(`Initial setup completed for company: ${company.name} (${company.id})`);

    const session = await authService.issueSession(user.id);

    return {
      ...session,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
    };
  }
}

export const setupService = new SetupService();
