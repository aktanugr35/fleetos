import { LoadStatus, SettlementStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { CreateSettlementInput } from './settlements.schema';
import { pdfService } from './pdf.service';
import { getLoadWorkDate, getPeriodBounds, isWithinPeriod } from '../../utils/datePeriod';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../utils/logger';
import {
  calculateLoadSettlementAmounts,
  grossRevenueFromLoad,
  resolveLoadRole,
  type SettlementLoadRole,
} from './settlements.eligible';

const loadInclude = {
  truck: true,
  driver: { select: { payStructure: true, payRate: true } },
} as const;

/** Items on finalized/paid settlements are locked; DRAFT settlements can be regenerated. */
const LOCKED_SETTLEMENT_STATUSES: SettlementStatus[] = ['FINALIZED', 'PAID'];

const notOnLockedSettlement = {
  settlement: { status: { in: LOCKED_SETTLEMENT_STATUSES } },
};

export class SettlementsService {
  /**
   * Generate a weekly settlement for a driver
   */
  async create(tenantId: string, input: CreateSettlementInput) {
    const driver = await prisma.driver.findFirst({
      where: { id: input.driverId, companyId: tenantId },
    });
    if (!driver) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');

    const { start: periodStart, end: periodEnd } = getPeriodBounds(input.weekStartDate, input.weekEndDate);

    const eligibleData = await this.getEligible(
      tenantId,
      input.driverId,
      periodStart,
      periodEnd
    );

    const loadsToSettle = eligibleData.loads.filter((l) => input.loadIds.includes(l.id));
    const hasLoads = loadsToSettle.length > 0;
    const hasDeductions = eligibleData.deductions.length > 0;
    const hasCredits = eligibleData.credits.length > 0;
    const fuelTransactions = eligibleData.fuelTransactions.filter((t) =>
      loadsToSettle.some((load) => load.truckId === t.truckId)
    );
    const tollTransactions = eligibleData.tollTransactions.filter((t) =>
      loadsToSettle.some((load) => load.truckId === t.truckId)
    );
    const hasFuelOrToll = fuelTransactions.length > 0 || tollTransactions.length > 0;
    const companyFeeCents = eligibleData.companyFeeCents;

    if (!hasLoads && !hasDeductions && !hasCredits && !hasFuelOrToll && companyFeeCents === 0) {
      throw new AppError(
        400,
        'NOTHING_TO_SETTLE',
        'No loads, deductions, or credits found for this driver in the selected period'
      );
    }

    if (input.loadIds.length > 0 && loadsToSettle.length !== input.loadIds.length) {
      throw new AppError(
        400,
        'INVALID_LOADS',
        'One or more selected loads are not in this period for the selected driver'
      );
    }

    let totalGrossCents = 0;
    let companyCommissionTotal = 0;

    const lineItems = loadsToSettle.map((load) => {
      totalGrossCents += load.calculatedGrossCents;
      companyCommissionTotal += load.companyCommissionCents || 0;

      return {
        loadId: load.id,
        description: `Load ${load.loadNumber} - ${load.totalRevenueCents / 100} gross`,
        grossAmount: load.totalRevenueCents,
        commissionRate: driver.payRate || 0,
        commissionAmount: load.companyCommissionCents || 0,
        netAmount: load.calculatedGrossCents,
      };
    });

    const periodDeductions = eligibleData.deductions;
    const credits = eligibleData.credits;

    const count = await prisma.settlement.count({ where: { companyId: tenantId } });
    const settlementNumber = `SET-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    if (loadsToSettle.length > 0) {
      const lockedLoads = await prisma.settlementLine.findMany({
        where: {
          loadId: { in: loadsToSettle.map((l) => l.id) },
          settlement: { status: { in: LOCKED_SETTLEMENT_STATUSES } },
        },
        select: { loadId: true },
      });
      if (lockedLoads.length > 0) {
        throw new AppError(
          409,
          'LOAD_ALREADY_SETTLED',
          'One or more selected loads are already on a finalized or paid settlement'
        );
      }
    }

    const settlement = await prisma.$transaction(async (tx) => {
      const settlementDeductions = periodDeductions.map((d) => ({
        deductionId: d.id,
        amount: d.amount,
      }));

      if (companyFeeCents > 0) {
        const companyFeeDeduction = await tx.deduction.create({
          data: {
            companyId: tenantId,
            driverId: input.driverId,
            type: 'COMPANY_FEE',
            description: 'Company Fee',
            amount: companyFeeCents,
            date: periodEnd,
            isRecurring: false,
          },
        });
        settlementDeductions.push({
          deductionId: companyFeeDeduction.id,
          amount: companyFeeDeduction.amount,
        });
      }

      const totalDeductionsCents = settlementDeductions.reduce((sum, d) => sum + d.amount, 0);
      const fuelTotalCents = fuelTransactions.reduce((sum, f) => sum + f.netAmount, 0);
      const tollTotalCents = tollTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalCreditsCents = credits.reduce((sum, c) => sum + c.amount, 0);
      const netPayCents = totalGrossCents - totalDeductionsCents - fuelTotalCents - tollTotalCents + totalCreditsCents;

      if (loadsToSettle.length > 0) {
        await tx.load.updateMany({
          where: {
            id: { in: loadsToSettle.map((l) => l.id) },
            status: { in: [LoadStatus.PENDING, LoadStatus.IN_TRANSIT] },
          },
          data: { status: LoadStatus.DELIVERED },
        });
      }

      return tx.settlement.create({
        data: {
          companyId: tenantId,
          driverId: input.driverId,
          statementNumber: settlementNumber,
          periodStart,
          periodEnd,
          grossAmount: totalGrossCents,
          deductionTotal: totalDeductionsCents + fuelTotalCents + tollTotalCents,
          creditTotal: totalCreditsCents,
          netAmount: netPayCents,
          companyCommission: companyCommissionTotal,
          status: 'DRAFT',
          notes: input.notes,
          lines: { create: lineItems },
          deductions: { create: settlementDeductions },
          fuelTransactions: {
            create: fuelTransactions.map((f) => ({
              fuelTransactionId: f.id,
              amount: f.netAmount,
            })),
          },
          tollTransactions: {
            create: tollTransactions.map((t) => ({
              tollTransactionId: t.id,
              amount: t.amount,
            })),
          },
          credits: {
            create: credits.map((c) => ({
              creditId: c.id,
              amount: c.amount,
            })),
          },
        },
        include: {
          driver: { select: { id: true, firstName: true, lastName: true, driverType: true } },
          lines: true,
          deductions: true,
          credits: true,
          fuelTransactions: true,
          tollTransactions: true,
        },
      });
    });

    let pdfUrl: string | null = null;
    try {
      pdfUrl = await pdfService.generateSettlementPdf(settlement.id, tenantId);
    } catch (err) {
      logger.error('Settlement PDF generation failed after create', {
        settlementId: settlement.id,
        err,
      });
      await notificationsService.createPdfGenerationFailed(
        tenantId,
        settlement.id,
        settlement.statementNumber
      );
    }

    const full = await this.getById(tenantId, settlement.id);
    return { settlement: full, pdfUrl, pdfGenerated: Boolean(pdfUrl) };
  }

  async list(tenantId: string, driverId?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = { companyId: tenantId };
    if (driverId) where.driverId = driverId;

    const skip = (page - 1) * limit;
    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: {
          driver: { select: { id: true, firstName: true, lastName: true, driverType: true } },
          _count: { select: { lines: true, deductions: true, credits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.settlement.count({ where }),
    ]);
    return { settlements, total };
  }

  async getById(tenantId: string, settlementId: string) {
    const settlement = await prisma.settlement.findFirst({
      where: { id: settlementId, companyId: tenantId },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true, driverType: true, payStructure: true, payRate: true } },
        lines: true,
        deductions: { include: { deduction: true } },
        credits: { include: { credit: true } },
        fuelTransactions: { include: { fuelTransaction: { include: { fuelCard: true, truck: true } } } },
        tollTransactions: { include: { tollTransaction: { include: { tollDevice: true, truck: true } } } },
      },
    });
    if (!settlement) throw new AppError(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    return settlement;
  }

  async approve(tenantId: string, settlementId: string) {
    const existing = await prisma.settlement.findFirst({
      where: { id: settlementId, companyId: tenantId },
      include: { driver: { select: { firstName: true, lastName: true } } },
    });
    if (!existing) throw new AppError(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    if (existing.status !== 'DRAFT') throw new AppError(400, 'INVALID_STATUS', 'Settlement must be in DRAFT status');

    const loadIds = (
      await prisma.settlementLine.findMany({
        where: { settlementId },
        select: { loadId: true },
      })
    ).map((line) => line.loadId);

    if (loadIds.length > 0) {
      const conflict = await prisma.settlementLine.findFirst({
        where: {
          loadId: { in: loadIds },
          settlementId: { not: settlementId },
          settlement: { status: { in: LOCKED_SETTLEMENT_STATUSES } },
        },
        select: { loadId: true },
      });
      if (conflict) {
        throw new AppError(
          409,
          'LOAD_ALREADY_SETTLED',
          'One or more loads on this settlement are already on another finalized or paid statement'
        );
      }
    }

    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'FINALIZED', finalizedAt: new Date() },
    });

    const driverName = `${existing.driver.firstName} ${existing.driver.lastName}`;
    await notificationsService.createSettlementReady(
      tenantId,
      settlementId,
      driverName,
      updated.payrollId,
      updated.statementNumber
    );

    return updated;
  }

  async markPaid(tenantId: string, settlementId: string) {
    const existing = await prisma.settlement.findFirst({ where: { id: settlementId, companyId: tenantId } });
    if (!existing) throw new AppError(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    if (existing.status !== 'FINALIZED') {
      throw new AppError(400, 'INVALID_STATUS', 'Settlement must be finalized before marking as paid');
    }

    return prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'PAID' },
    });
  }

  private async fetchDriverLoadCandidates(tenantId: string, driverId: string) {
    const baseWhere = {
      companyId: tenantId,
      status: { notIn: [LoadStatus.CANCELLED] },
    };

    const [driverLoads, ownerLoads] = await Promise.all([
      prisma.load.findMany({
        where: { ...baseWhere, driverId },
        include: loadInclude,
        orderBy: { pickupDate: 'asc' },
      }),
      prisma.load.findMany({
        where: { ...baseWhere, truck: { ownerDriverId: driverId } },
        include: loadInclude,
        orderBy: { pickupDate: 'asc' },
      }),
    ]);

    const driverIds = new Set(driverLoads.map((l) => l.id));
    const ownerIds = new Set(ownerLoads.map((l) => l.id));
    const allIds = new Set([...driverIds, ...ownerIds]);

    return Array.from(allIds).map((id) => {
      const load = driverLoads.find((l) => l.id === id) ?? ownerLoads.find((l) => l.id === id)!;
      const role = resolveLoadRole(driverIds.has(id), ownerIds.has(id));
      return { ...load, role };
    });
  }

  async getEligible(
    tenantId: string,
    driverId: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    const { start, end } = getPeriodBounds(periodStart, periodEnd);
    const candidates = await this.fetchDriverLoadCandidates(tenantId, driverId);

    const rawLoads = candidates.filter((load) =>
      isWithinPeriod(getLoadWorkDate(load), start, end)
    );

    const loadIds = rawLoads.map((l) => l.id);
    const [lockedLoadIds, allDeductions, allCredits] = await Promise.all([
      loadIds.length > 0
        ? prisma.settlementLine.findMany({
            where: {
              loadId: { in: loadIds },
              settlement: { status: { in: LOCKED_SETTLEMENT_STATUSES } },
            },
            select: { loadId: true },
          })
        : Promise.resolve([]),
      prisma.deduction.findMany({
        where: {
          companyId: tenantId,
          driverId,
          settlementDeductions: { none: notOnLockedSettlement },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.credit.findMany({
        where: {
          companyId: tenantId,
          driverId,
          settlementCredits: { none: notOnLockedSettlement },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    const lockedLoadSet = new Set(lockedLoadIds.map((r) => r.loadId));
    const eligibleLoads = rawLoads.filter((l) => !lockedLoadSet.has(l.id));

    const deductions = allDeductions.filter(
      (d) => !['COMPANY_FEE', 'FUEL', 'TOLL'].includes(d.type) && isWithinPeriod(d.date, start, end)
    );
    const credits = allCredits.filter((c) => isWithinPeriod(c.date, start, end));

    const company = await prisma.company.findUnique({ where: { id: tenantId } });
    const commissionRate = company?.defaultOOCommissionRate || 1200;

    const loads = eligibleLoads.map((load) => {
      const grossRev = grossRevenueFromLoad(load);
      const payStructure = load.driver?.payStructure ?? 'PERCENTAGE';
      const payRate = load.driver?.payRate ?? 0;
      const { calculatedGrossCents, companyCommissionCents } = calculateLoadSettlementAmounts({
        role: load.role as SettlementLoadRole,
        grossRevenueCents: grossRev,
        payStructure,
        payRate,
        totalMiles: load.totalMiles || 0,
        companyCommissionRateHundredths: commissionRate,
      });

      return {
        ...load,
        miles: load.totalMiles,
        totalRevenueCents: grossRev,
        calculatedGrossCents,
        companyCommissionCents,
        workDate: getLoadWorkDate(load),
      };
    });

    const companyFeeCents = company?.weeklyCompanyFee ?? 0;
    const truckIds = [...new Set(rawLoads.map((l) => l.truckId))];
    const [fuelTransactions, tollTransactions] = truckIds.length > 0
      ? await Promise.all([
          prisma.fuelTransaction.findMany({
            where: {
              companyId: tenantId,
              truckId: { in: truckIds },
              date: { gte: start, lte: end },
              settlementFuelTransactions: { none: notOnLockedSettlement },
            },
            include: { fuelCard: true, truck: true },
            orderBy: { date: 'asc' },
          }),
          prisma.tollTransaction.findMany({
            where: {
              companyId: tenantId,
              truckId: { in: truckIds },
              date: { gte: start, lte: end },
              settlementTollTransactions: { none: notOnLockedSettlement },
            },
            include: { tollDevice: true, truck: true },
            orderBy: { date: 'asc' },
          }),
        ])
      : [[], []];

    return {
      loads,
      deductions,
      credits,
      fuelTransactions,
      tollTransactions,
      companyFeeCents,
      summary: {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        loadsInPeriod: loads.length,
        deductionsInPeriod: deductions.length,
        creditsInPeriod: credits.length,
        fuelTransactionsInPeriod: fuelTransactions.length,
        tollTransactionsInPeriod: tollTransactions.length,
      },
    };
  }
}

export const settlementsService = new SettlementsService();
