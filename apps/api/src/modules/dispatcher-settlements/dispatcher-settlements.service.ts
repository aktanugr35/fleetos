import { LoadStatus, SettlementStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { getLoadWorkDate, getPeriodBounds, isWithinPeriod } from '../../utils/datePeriod';
import { logger } from '../../utils/logger';
import { grossRevenueFromLoad } from '../settlements/settlements.eligible';
import type { CreateDispatcherSettlementInput } from './dispatcher-settlements.schema';
import { dispatcherPdfService } from './dispatcher-pdf.service';

const LOCKED_STATUSES: SettlementStatus[] = ['FINALIZED', 'PAID'];

export function dispatcherCommissionCents(grossRevenueCents: number, commissionRateHundredths: number): number {
  return Math.round((grossRevenueCents * commissionRateHundredths) / 10000);
}

export class DispatcherSettlementsService {
  async list(tenantId: string, dispatcherId?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = { companyId: tenantId };
    if (dispatcherId) where.dispatcherId = dispatcherId;

    const skip = (page - 1) * limit;
    const [settlements, total] = await Promise.all([
      prisma.dispatcherSettlement.findMany({
        where,
        include: {
          dispatcher: { select: { id: true, firstName: true, lastName: true, commissionRate: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.dispatcherSettlement.count({ where }),
    ]);
    return { settlements, total };
  }

  async getById(tenantId: string, settlementId: string) {
    const settlement = await prisma.dispatcherSettlement.findFirst({
      where: { id: settlementId, companyId: tenantId },
      include: {
        dispatcher: { select: { id: true, firstName: true, lastName: true, commissionRate: true } },
        lines: {
          include: {
            load: {
              select: {
                id: true,
                loadNumber: true,
                brokerName: true,
                pickupLocation: true,
                deliveryLocation: true,
                pickupDate: true,
                deliveryDate: true,
              },
            },
          },
        },
      },
    });
    if (!settlement) {
      throw new AppError(404, 'DISPATCHER_SETTLEMENT_NOT_FOUND', 'Dispatcher settlement not found');
    }
    return settlement;
  }

  async getEligible(
    tenantId: string,
    dispatcherId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const { start, end } = getPeriodBounds(periodStart, periodEnd);

    const dispatcher = await prisma.dispatcher.findFirst({
      where: { id: dispatcherId, companyId: tenantId, isActive: true },
      select: { id: true, commissionRate: true },
    });
    if (!dispatcher) {
      throw new AppError(404, 'DISPATCHER_NOT_FOUND', 'Dispatcher not found');
    }

    const settledLoadIds = new Set(
      (
        await prisma.dispatcherSettlementLine.findMany({
          where: { load: { companyId: tenantId, bookedByDispatcherId: dispatcherId } },
          select: { loadId: true },
        })
      ).map((row) => row.loadId),
    );

    const candidates = await prisma.load.findMany({
      where: {
        companyId: tenantId,
        bookedByDispatcherId: dispatcherId,
        status: { notIn: [LoadStatus.CANCELLED] },
      },
      include: {
        driver: { select: { firstName: true, lastName: true } },
        truck: { select: { unitNumber: true } },
      },
      orderBy: { pickupDate: 'asc' },
    });

    const loads = candidates
      .filter((load) => !settledLoadIds.has(load.id))
      .filter((load) => isWithinPeriod(getLoadWorkDate(load), start, end))
      .map((load) => {
        const grossRev = grossRevenueFromLoad(load);
        const commissionAmount = dispatcherCommissionCents(grossRev, dispatcher.commissionRate);
        return {
          ...load,
          totalRevenueCents: grossRev,
          commissionRate: dispatcher.commissionRate,
          commissionAmount,
          netAmount: commissionAmount,
          workDate: getLoadWorkDate(load),
        };
      });

    return {
      loads,
      summary: {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        loadsInPeriod: loads.length,
        commissionRate: dispatcher.commissionRate,
      },
    };
  }

  async create(tenantId: string, input: CreateDispatcherSettlementInput) {
    const dispatcher = await prisma.dispatcher.findFirst({
      where: { id: input.dispatcherId, companyId: tenantId, isActive: true },
    });
    if (!dispatcher) {
      throw new AppError(404, 'DISPATCHER_NOT_FOUND', 'Dispatcher not found');
    }

    const { start: periodStart, end: periodEnd } = getPeriodBounds(input.weekStartDate, input.weekEndDate);
    const eligible = await this.getEligible(tenantId, input.dispatcherId, periodStart, periodEnd);
    const loadsToSettle = eligible.loads.filter((l) => input.loadIds.includes(l.id));

    if (loadsToSettle.length === 0) {
      throw new AppError(400, 'NOTHING_TO_SETTLE', 'No booked loads found for this dispatcher in the selected period');
    }

    if (input.loadIds.length > 0 && loadsToSettle.length !== input.loadIds.length) {
      throw new AppError(
        400,
        'INVALID_LOADS',
        'One or more selected loads are not eligible for this dispatcher in the selected period',
      );
    }

    let grossTotal = 0;
    let commissionTotal = 0;

    const lineItems = loadsToSettle.map((load) => {
      grossTotal += load.totalRevenueCents;
      commissionTotal += load.commissionAmount;
      return {
        loadId: load.id,
        description: `Load ${load.loadNumber} - booked commission`,
        grossAmount: load.totalRevenueCents,
        commissionRate: dispatcher.commissionRate,
        commissionAmount: load.commissionAmount,
        netAmount: load.commissionAmount,
      };
    });

    const count = await prisma.dispatcherSettlement.count({ where: { companyId: tenantId } });
    const statementNumber = `DSP-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    const settlement = await prisma.$transaction(async (tx) => {
      if (loadsToSettle.length > 0) {
        await tx.load.updateMany({
          where: {
            id: { in: loadsToSettle.map((l) => l.id) },
            status: { in: [LoadStatus.PENDING, LoadStatus.IN_TRANSIT] },
          },
          data: { status: LoadStatus.DELIVERED },
        });
      }

      return tx.dispatcherSettlement.create({
        data: {
          companyId: tenantId,
          dispatcherId: input.dispatcherId,
          statementNumber,
          periodStart,
          periodEnd,
          grossAmount: grossTotal,
          commissionTotal,
          netAmount: commissionTotal,
          status: 'DRAFT',
          notes: input.notes,
          lines: { create: lineItems },
        },
        include: {
          dispatcher: { select: { id: true, firstName: true, lastName: true, commissionRate: true } },
          lines: true,
        },
      });
    });

    let pdfUrl: string | null = null;
    try {
      pdfUrl = await dispatcherPdfService.generatePdf(settlement.id, tenantId);
    } catch (err) {
      logger.error('Dispatcher settlement PDF generation failed after create', {
        settlementId: settlement.id,
        err,
      });
    }

    const full = await this.getById(tenantId, settlement.id);
    return { settlement: full, pdfUrl, pdfGenerated: Boolean(pdfUrl) };
  }

  async approve(tenantId: string, settlementId: string) {
    const existing = await prisma.dispatcherSettlement.findFirst({
      where: { id: settlementId, companyId: tenantId },
    });
    if (!existing) {
      throw new AppError(404, 'DISPATCHER_SETTLEMENT_NOT_FOUND', 'Dispatcher settlement not found');
    }
    if (existing.status !== 'DRAFT') {
      throw new AppError(400, 'INVALID_STATUS', 'Settlement must be in DRAFT status');
    }

    const loadIds = (
      await prisma.dispatcherSettlementLine.findMany({
        where: { dispatcherSettlementId: settlementId },
        select: { loadId: true },
      })
    ).map((line) => line.loadId);

    if (loadIds.length > 0) {
      const conflict = await prisma.dispatcherSettlementLine.findFirst({
        where: {
          loadId: { in: loadIds },
          dispatcherSettlementId: { not: settlementId },
          dispatcherSettlement: { status: { in: LOCKED_STATUSES } },
        },
        select: { loadId: true },
      });
      if (conflict) {
        throw new AppError(
          409,
          'LOAD_ALREADY_SETTLED',
          'One or more loads are already on another finalized or paid dispatcher statement',
        );
      }
    }

    return prisma.dispatcherSettlement.update({
      where: { id: settlementId },
      data: { status: 'FINALIZED', finalizedAt: new Date() },
    });
  }

  async markPaid(tenantId: string, settlementId: string) {
    const existing = await prisma.dispatcherSettlement.findFirst({
      where: { id: settlementId, companyId: tenantId },
    });
    if (!existing) {
      throw new AppError(404, 'DISPATCHER_SETTLEMENT_NOT_FOUND', 'Dispatcher settlement not found');
    }
    if (existing.status !== 'FINALIZED') {
      throw new AppError(400, 'INVALID_STATUS', 'Settlement must be finalized before marking as paid');
    }

    return prisma.dispatcherSettlement.update({
      where: { id: settlementId },
      data: { status: 'PAID' },
    });
  }
}

export const dispatcherSettlementsService = new DispatcherSettlementsService();
