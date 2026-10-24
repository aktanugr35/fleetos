import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { grossLineCents, REVENUE_STATUSES, revenueDate, revenueDateWhere } from '../reports/reports.revenue';
import { buildProfitAndLoss, type PnlItem, type ProfitAndLoss } from './accounting.pnl';
import type { AccountingEntryInput, AccountingListQuery } from './accounting.schema';

const PAID_OUT_STATUSES = ['FINALIZED', 'PAID'] as const;

const entryInclude = {
  truck: { select: { id: true, unitNumber: true } },
} satisfies Prisma.AccountingEntryInclude;

function dayAfter(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

export class AccountingService {
  /** [from, to] inclusive; `to` is the end of the last day. */
  async getProfitAndLoss(tenantId: string, from: Date, to: Date): Promise<ProfitAndLoss> {
    const toExclusive = new Date(to.getTime() + 1);
    const inRange = { gte: from, lt: toExclusive };

    const [loads, settlements, dispatcherSettlements, fuel, tolls, entries] = await Promise.all([
      prisma.load.findMany({
        where: { companyId: tenantId, status: { in: [...REVENUE_STATUSES] }, ...revenueDateWhere(from, toExclusive) },
        select: {
          rateTotal: true,
          detentionPay: true,
          lumperFee: true,
          fuelSurcharge: true,
          tonuAmount: true,
          deliveryDate: true,
          actualDeliveryDate: true,
          pickupDate: true,
          factoringFeeCents: true,
        },
      }),
      prisma.settlement.findMany({
        where: { companyId: tenantId, status: { in: [...PAID_OUT_STATUSES] }, periodEnd: inRange },
        select: { periodEnd: true, netAmount: true },
      }),
      prisma.dispatcherSettlement.findMany({
        where: { companyId: tenantId, status: { in: [...PAID_OUT_STATUSES] }, periodEnd: inRange },
        select: { periodEnd: true, netAmount: true },
      }),
      prisma.fuelTransaction.findMany({
        where: { companyId: tenantId, date: inRange },
        select: { date: true, netAmount: true },
      }),
      prisma.tollTransaction.findMany({
        where: { companyId: tenantId, date: inRange },
        select: { date: true, amount: true },
      }),
      prisma.accountingEntry.findMany({
        where: { companyId: tenantId, date: inRange },
        select: { kind: true, category: true, date: true, amount: true },
      }),
    ]);

    const items: PnlItem[] = [];
    for (const load of loads) {
      const date = revenueDate(load);
      if (!date) continue;
      items.push({ side: 'income', key: 'LOAD_REVENUE', date, amountCents: grossLineCents(load) });
      if (load.factoringFeeCents) {
        items.push({ side: 'expense', key: 'FACTORING_FEES', date, amountCents: load.factoringFeeCents });
      }
    }
    for (const s of settlements) {
      items.push({ side: 'expense', key: 'DRIVER_PAY', date: s.periodEnd, amountCents: s.netAmount });
    }
    for (const s of dispatcherSettlements) {
      items.push({ side: 'expense', key: 'DISPATCHER_PAY', date: s.periodEnd, amountCents: s.netAmount });
    }
    for (const f of fuel) {
      items.push({ side: 'expense', key: 'FUEL', date: f.date, amountCents: f.netAmount });
    }
    for (const t of tolls) {
      items.push({ side: 'expense', key: 'TOLLS', date: t.date, amountCents: t.amount });
    }
    for (const e of entries) {
      items.push({
        side: e.kind === 'INCOME' ? 'income' : 'expense',
        key: e.category,
        date: e.date,
        amountCents: e.amount,
      });
    }

    return buildProfitAndLoss(from, to, items);
  }

  async list(tenantId: string, query: AccountingListQuery) {
    const where: Prisma.AccountingEntryWhereInput = { companyId: tenantId, kind: query.kind };
    if (query.category) where.category = query.category;
    if (query.truckId) where.truckId = query.truckId;
    if (query.from || query.to) {
      where.date = {
        ...(query.from && { gte: query.from }),
        ...(query.to && { lt: dayAfter(query.to) }),
      };
    }
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      where.OR = [{ vendor: contains }, { description: contains }, { reference: contains }];
    }

    const skip = (query.page - 1) * query.limit;
    const [entries, total, sum] = await Promise.all([
      prisma.accountingEntry.findMany({
        where,
        include: entryInclude,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
      prisma.accountingEntry.count({ where }),
      prisma.accountingEntry.aggregate({ where, _sum: { amount: true } }),
    ]);

    return { entries, total, totalAmountCents: sum._sum.amount ?? 0, skip };
  }

  async create(tenantId: string, userId: string | undefined, input: AccountingEntryInput) {
    await this.assertTruck(tenantId, input.truckId);
    return prisma.accountingEntry.create({
      data: { ...input, companyId: tenantId, createdById: userId ?? null },
      include: entryInclude,
    });
  }

  async update(tenantId: string, id: string, input: AccountingEntryInput) {
    await this.findOrThrow(tenantId, id);
    await this.assertTruck(tenantId, input.truckId);
    return prisma.accountingEntry.update({ where: { id }, data: input, include: entryInclude });
  }

  async delete(tenantId: string, id: string) {
    await this.findOrThrow(tenantId, id);
    await prisma.accountingEntry.delete({ where: { id } });
  }

  private async findOrThrow(tenantId: string, id: string) {
    const entry = await prisma.accountingEntry.findFirst({ where: { id, companyId: tenantId }, select: { id: true } });
    if (!entry) throw new AppError(404, 'ACCOUNTING_ENTRY_NOT_FOUND', 'Entry not found');
    return entry;
  }

  private async assertTruck(tenantId: string, truckId: string | null) {
    if (!truckId) return;
    const truck = await prisma.truck.findFirst({ where: { id: truckId, companyId: tenantId }, select: { id: true } });
    if (!truck) throw new AppError(404, 'TRUCK_NOT_FOUND', 'Truck not found');
  }
}

export const accountingService = new AccountingService();
