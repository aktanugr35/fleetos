import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { CreateDeductionInput } from '../settlements/settlements.schema';

function buildFuelMetadata(input: CreateDeductionInput): Record<string, unknown> | undefined {
  if (input.type !== 'FUEL' || !input.metadata) return undefined;
  const discount = input.metadata.discountCents ?? 0;
  const gross = input.metadata.grossAmountCents ?? input.amount + discount;
  return {
    merchant: input.metadata.merchant,
    gallons: input.metadata.gallons,
    discount,
    grossAmount: gross,
  };
}

export class DeductionsService {
  async list(tenantId: string, driverId?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = { companyId: tenantId };
    if (driverId) where.driverId = driverId;

    const skip = (page - 1) * limit;
    const [deductions, total] = await Promise.all([
      prisma.deduction.findMany({
        where,
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deduction.count({ where }),
    ]);
    return { deductions, total };
  }

  async create(tenantId: string, input: CreateDeductionInput) {
    const metadata = buildFuelMetadata(input);

    return prisma.deduction.create({
      data: {
        companyId: tenantId,
        driverId: input.driverId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        isRecurring: input.isRecurring,
        date: input.date || new Date(),
        metadata: metadata ? (metadata as object) : undefined,
      },
      include: { driver: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(tenantId: string, id: string, input: Partial<CreateDeductionInput>) {
    const existing = await prisma.deduction.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!existing) throw new AppError(404, 'DEDUCTION_NOT_FOUND', 'Deduction not found');

    const type = input.type ?? existing.type;
    const merged: CreateDeductionInput = {
      driverId: input.driverId ?? existing.driverId,
      type: type as CreateDeductionInput['type'],
      amount: input.amount ?? existing.amount,
      description: input.description ?? existing.description,
      isRecurring: input.isRecurring ?? existing.isRecurring,
      date: input.date ?? existing.date,
      metadata: input.metadata,
    };

    const metadata = buildFuelMetadata(merged);

    return prisma.deduction.update({
      where: { id },
      data: {
        ...(input.driverId !== undefined && { driverId: input.driverId }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
        ...(input.date !== undefined && { date: input.date }),
        ...(metadata !== undefined && { metadata: metadata as object }),
      },
      include: { driver: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.deduction.findFirst({
      where: { id, companyId: tenantId },
      include: { _count: { select: { settlementDeductions: true } } },
    });
    if (!existing) throw new AppError(404, 'DEDUCTION_NOT_FOUND', 'Deduction not found');
    if (existing._count.settlementDeductions > 0) {
      throw new AppError(
        409,
        'ALREADY_APPLIED',
        'Cannot delete a deduction that is on a settlement'
      );
    }
    await prisma.deduction.delete({ where: { id } });
  }
}

export const deductionsService = new DeductionsService();
