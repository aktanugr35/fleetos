import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { JwtPayload } from '../../middleware/auth.middleware';
import type { CreateUserInput, UpdateUserInput, UserQueryInput } from './users.schema';
import { COMPANY_ASSIGNABLE_ROLES } from './users.roles';

const BCRYPT_ROUNDS = 12;

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  driver: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

export class UsersService {
  async list(tenantId: string, query: UserQueryInput) {
    const where: {
      companyId: string;
      role: { not: typeof UserRole.SUPER_ADMIN };
      isActive?: boolean;
      OR?: Array<Record<string, unknown>>;
    } = {
      companyId: tenantId,
      role: { not: UserRole.SUPER_ADMIN },
    };

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async getById(tenantId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: tenantId,
        role: { not: UserRole.SUPER_ADMIN },
      },
      select: userSelect,
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return user;
  }

  async create(tenantId: string, actor: JwtPayload, input: CreateUserInput) {
    this.assertCanManage(actor);

    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      if (input.role === UserRole.DRIVER && input.driverId) {
        await this.assertDriverLinkable(tx, tenantId, input.driverId);
      }

      const created = await tx.user.create({
        data: {
          companyId: tenantId,
          email: input.email,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: input.role,
        },
        select: userSelect,
      });

      if (input.role === UserRole.DRIVER && input.driverId) {
        await tx.driver.update({
          where: { id: input.driverId },
          data: { userId: created.id },
        });
        return tx.user.findUniqueOrThrow({
          where: { id: created.id },
          select: userSelect,
        });
      }

      return created;
    });

    return user;
  }

  async update(tenantId: string, actor: JwtPayload, userId: string, input: UpdateUserInput) {
    this.assertCanManage(actor);

    const existing = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: tenantId,
        role: { not: UserRole.SUPER_ADMIN },
      },
      include: { driver: { select: { id: true } } },
    });

    if (!existing) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (input.isActive === false && userId === actor.userId) {
      throw new AppError(400, 'CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own account');
    }

    const nextRole = input.role ?? existing.role;
    if (input.role && input.role !== existing.role) {
      if (userId === actor.userId) {
        throw new AppError(400, 'CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role');
      }
      await this.assertAdminCountAfterRoleChange(tenantId, existing.role, input.role, userId);
    }

    if (nextRole === UserRole.DRIVER && !existing.driver?.id && !input.driverId) {
      throw new AppError(400, 'DRIVER_PROFILE_REQUIRED', 'Select a driver profile to link for driver login accounts');
    }

    if (input.isActive === false && existing.role === UserRole.COMPANY_ADMIN) {
      await this.assertNotLastCompanyAdmin(tenantId, userId);
    }

    const data: {
      firstName?: string;
      lastName?: string;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (input.firstName) data.firstName = input.firstName.trim();
    if (input.lastName) data.lastName = input.lastName.trim();
    if (input.role) data.role = input.role;
    if (typeof input.isActive === 'boolean') data.isActive = input.isActive;
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      if (nextRole === UserRole.DRIVER && input.driverId) {
        await this.assertDriverLinkable(tx, tenantId, input.driverId, userId);
        if (existing.driver?.id && existing.driver.id !== input.driverId) {
          await tx.driver.update({
            where: { id: existing.driver.id },
            data: { userId: null },
          });
        }
        await tx.driver.update({
          where: { id: input.driverId },
          data: { userId },
        });
      } else if (nextRole !== UserRole.DRIVER && existing.driver?.id) {
        await tx.driver.update({
          where: { id: existing.driver.id },
          data: { userId: null },
        });
      } else if (nextRole === UserRole.DRIVER && input.driverId === null && existing.driver?.id) {
        await tx.driver.update({
          where: { id: existing.driver.id },
          data: { userId: null },
        });
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data,
        select: userSelect,
      });

      if (input.isActive === false || input.password) {
        await tx.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return updated;
    });

    return user;
  }

  async deactivate(tenantId: string, actor: JwtPayload, userId: string) {
    return this.update(tenantId, actor, userId, { isActive: false });
  }

  private assertCanManage(actor: JwtPayload) {
    if (actor.role !== UserRole.COMPANY_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to manage team accounts');
    }
  }

  private async assertNotLastCompanyAdmin(tenantId: string, userId: string) {
    const activeAdmins = await prisma.user.count({
      where: {
        companyId: tenantId,
        role: UserRole.COMPANY_ADMIN,
        isActive: true,
        id: { not: userId },
      },
    });

    if (activeAdmins === 0) {
      throw new AppError(400, 'LAST_COMPANY_ADMIN', 'Cannot remove the last active company administrator');
    }
  }

  private async assertAdminCountAfterRoleChange(
    tenantId: string,
    currentRole: UserRole,
    nextRole: UserRole,
    userId: string,
  ) {
    if (currentRole === UserRole.COMPANY_ADMIN && nextRole !== UserRole.COMPANY_ADMIN) {
      await this.assertNotLastCompanyAdmin(tenantId, userId);
    }
  }

  private async assertDriverLinkable(
    tx: Pick<typeof prisma, 'driver'>,
    tenantId: string,
    driverId: string,
    exceptUserId?: string,
  ) {
    const driver = await tx.driver.findFirst({
      where: { id: driverId, companyId: tenantId, isActive: true },
      select: { id: true, userId: true },
    });

    if (!driver) {
      throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver profile not found');
    }

    if (driver.userId && driver.userId !== exceptUserId) {
      throw new AppError(409, 'DRIVER_ALREADY_LINKED', 'This driver profile is already linked to another account');
    }
  }
}

export const usersService = new UsersService();
export { COMPANY_ASSIGNABLE_ROLES };
