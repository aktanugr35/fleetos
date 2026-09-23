import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { CreateCreditInput } from '../settlements/settlements.schema';

export class CreditsService {
  async list(tenantId: string, driverId?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = { companyId: tenantId };
    if (driverId) where.driverId = driverId;

    const skip = (page - 1) * limit;
    const [credits, total] = await Promise.all([
      prisma.credit.findMany({
        where,
        include: {
          driver: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.credit.count({ where }),
    ]);
    return { credits, total };
  }

  async create(tenantId: string, input: CreateCreditInput) {
    await this.assertDriver(tenantId, input.driverId);

    return prisma.credit.create({
      data: {
        companyId: tenantId,
        driverId: input.driverId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        isRecurring: input.isRecurring,
        date: input.date || new Date(),
      },
      include: { driver: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(tenantId: string, id: string, input: Partial<CreateCreditInput>) {
    const existing = await prisma.credit.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!existing) throw new AppError(404, 'CREDIT_NOT_FOUND', 'Credit not found');
    if (input.driverId !== undefined) {
      await this.assertDriver(tenantId, input.driverId);
    }
    return prisma.credit.update({
      where: { id },
      data: {
        ...(input.driverId !== undefined && { driverId: input.driverId }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
        ...(input.date !== undefined && { date: input.date }),
      },
      include: { driver: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.credit.findFirst({
      where: { id, companyId: tenantId },
      include: { _count: { select: { settlementCredits: true } } },
    });
    if (!existing) throw new AppError(404, 'CREDIT_NOT_FOUND', 'Credit not found');
    if (existing._count.settlementCredits > 0) {
      throw new AppError(409, 'ALREADY_APPLIED', 'Cannot delete a credit that is on a settlement');
    }
    await prisma.credit.delete({ where: { id } });
  }

  private async assertDriver(tenantId: string, driverId: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId },
    });
    if (!driver) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');
  }
}

export const creditsService = new CreditsService();
