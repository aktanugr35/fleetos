import { Prisma, type Load } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { deleteStoredFile } from '../../services/storage.service';
import type { CreateLoadInput, UpdateLoadInput, LoadQueryInput } from './loads.schema';
import { calculateLoadTotalCents, inferInitialLoadStatus } from './loads.logic';

/** Load row with optional relations from list/detail queries. */
type LoadForMap = Load & {
  driver?: { id: string; firstName: string; lastName: string } | null;
  truck?: { id: string; unitNumber: string } | null;
  trailer?: { id: string; unitNumber: string } | null;
  _count?: { settlementLines: number };
};

export class LoadsService {
  /**
   * Auto-generate load number: VT-YYYY-NNNNN
   */
  private async generateLoadNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.load.count({
      where: { companyId: tenantId },
    });
    const num = (count + 1).toString().padStart(5, '0');
    return `VT-${year}-${num}`;
  }

  private calculateTotalCents(input: CreateLoadInput): number {
    return calculateLoadTotalCents(input);
  }

  private inferInitialStatus(input: CreateLoadInput) {
    return inferInitialLoadStatus(input);
  }

  private mapLoad(load: LoadForMap) {
    const pickupParts = (load.pickupLocation || '').split(', ');
    const deliveryParts = (load.deliveryLocation || '').split(', ');
    return {
      ...load,
      pickupCity: pickupParts[0] || '',
      pickupState: pickupParts[1] || '',
      deliveryCity: deliveryParts[0] || '',
      deliveryState: deliveryParts[1] || '',
      miles: load.totalMiles,
      loadedMiles: load.loadedMiles || 0,
      deadheadMiles: load.deadheadMiles || 0,
      externalTrailerRef: load.externalTrailerRef,
      totalRevenueCents: load.rateTotal + (load.detentionPay || 0) + (load.lumperFee || 0) + (load.tonuAmount || 0),
      settlementLineCount: load._count?.settlementLines ?? 0,
    };
  }

  async list(tenantId: string, query: LoadQueryInput) {
    const where: Prisma.LoadWhereInput = { companyId: tenantId };

    if (query.status) where.status = query.status;
    if (query.driverId) where.driverId = query.driverId;

    if (query.search) {
      where.OR = [
        { loadNumber: { contains: query.search, mode: 'insensitive' } },
        { brokerName: { contains: query.search, mode: 'insensitive' } },
        { pickupLocation: { contains: query.search, mode: 'insensitive' } },
        { deliveryLocation: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.pickupDate = {};
      if (query.dateFrom) where.pickupDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.pickupDate.lte = new Date(query.dateTo);
    }

    const [loads, total] = await Promise.all([
      prisma.load.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { pickupDate: 'desc' },
        include: {
          driver: { select: { id: true, firstName: true, lastName: true } },
          truck: { select: { id: true, unitNumber: true } },
          trailer: { select: { id: true, unitNumber: true } },
        },
      }),
      prisma.load.count({ where }),
    ]);

    return { loads: loads.map(this.mapLoad), total };
  }

  async getById(tenantId: string, loadId: string) {
    const load = await prisma.load.findFirst({
      where: { id: loadId, companyId: tenantId },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true, driverType: true, payStructure: true, payRate: true } },
        truck: { select: { id: true, unitNumber: true, make: true, model: true } },
        trailer: { select: { id: true, unitNumber: true } },
        _count: { select: { settlementLines: true } },
      },
    });
    if (!load) throw new AppError(404, 'LOAD_NOT_FOUND', 'Load not found');
    return this.mapLoad(load);
  }

  async create(tenantId: string, input: CreateLoadInput) {
    const loadNumber = input.loadNumber || await this.generateLoadNumber(tenantId);
    const status = this.inferInitialStatus(input);
    const baseRateTotal = this.calculateTotalCents({
      ...input,
      detentionCents: 0,
      lumperCents: 0,
      otherChargesCents: 0,
    });

    const load = await prisma.load.create({
      data: {
        companyId: tenantId,
        driverId: input.driverId,
        truckId: input.truckId,
        trailerId: input.externalTrailerRef ? null : input.trailerId ?? null,
        externalTrailerRef: input.externalTrailerRef?.trim() || null,
        loadNumber,
        brokerName: input.brokerName,
        brokerMC: input.brokerMC,
        referenceNumber: input.brokerContact,
        pickupLocation: `${input.pickupCity}, ${input.pickupState}`,
        pickupDate: input.pickupDate,
        deliveryLocation: `${input.deliveryCity}, ${input.deliveryState}`,
        deliveryDate: input.deliveryDate,
        actualDeliveryDate: status === 'DELIVERED' ? (input.actualDeliveryDate || input.deliveryDate) : undefined,
        loadedMiles: input.loadedMiles,
        deadheadMiles: input.deadheadMiles,
        totalMiles: (input.loadedMiles || 0) + (input.deadheadMiles || 0),
        rateTotal: baseRateTotal,
        rateMiles: input.rateType === 'PER_MILE' ? input.rateCents : undefined,
        detentionPay: input.detentionCents,
        lumperFee: input.lumperCents,
        fuelSurcharge: input.otherChargesCents,
        notes: input.notes,
        status,
      },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
        truck: { select: { id: true, unitNumber: true } },
        trailer: { select: { id: true, unitNumber: true } },
      },
    });

    if (input.rateConfirmationDocumentId) {
      await prisma.document.update({
        where: { id: input.rateConfirmationDocumentId },
        data: { loadId: load.id },
      });
    }

    return load;
  }

  async update(tenantId: string, loadId: string, input: UpdateLoadInput) {
    const existing = await prisma.load.findFirst({ where: { id: loadId, companyId: tenantId } });
    if (!existing) throw new AppError(404, 'LOAD_NOT_FOUND', 'Load not found');

    if (input.driverId !== undefined) {
      const driver = await prisma.driver.findFirst({
        where: { id: input.driverId, companyId: tenantId, isActive: true },
      });
      if (!driver) {
        throw new AppError(400, 'INVALID_DRIVER', 'Driver not found or inactive');
      }
    }

    if (input.truckId !== undefined) {
      const truck = await prisma.truck.findFirst({
        where: { id: input.truckId, companyId: tenantId, isActive: true },
      });
      if (!truck) {
        throw new AppError(400, 'INVALID_TRUCK', 'Truck not found or inactive');
      }
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (input.driverId !== undefined) dataToUpdate.driverId = input.driverId;
    if (input.truckId !== undefined) dataToUpdate.truckId = input.truckId;
    if (input.externalTrailerRef !== undefined) {
      dataToUpdate.externalTrailerRef = input.externalTrailerRef?.trim() || null;
      dataToUpdate.trailerId = input.externalTrailerRef ? null : input.trailerId ?? null;
    } else if (input.trailerId !== undefined) {
      dataToUpdate.trailerId = input.trailerId;
      if (input.trailerId) dataToUpdate.externalTrailerRef = null;
    }
    if (input.brokerName !== undefined) dataToUpdate.brokerName = input.brokerName;
    if (input.brokerMC !== undefined) dataToUpdate.brokerMC = input.brokerMC;
    if (input.brokerContact !== undefined) dataToUpdate.referenceNumber = input.brokerContact;
    if (input.pickupCity !== undefined && input.pickupState !== undefined) {
      dataToUpdate.pickupLocation = `${input.pickupCity}, ${input.pickupState}`;
    }
    if (input.pickupDate !== undefined) dataToUpdate.pickupDate = input.pickupDate;
    if (input.deliveryCity !== undefined && input.deliveryState !== undefined) {
      dataToUpdate.deliveryLocation = `${input.deliveryCity}, ${input.deliveryState}`;
    }
    if (input.deliveryDate !== undefined) dataToUpdate.deliveryDate = input.deliveryDate;
    if (input.loadedMiles !== undefined) dataToUpdate.loadedMiles = input.loadedMiles;
    if (input.deadheadMiles !== undefined) dataToUpdate.deadheadMiles = input.deadheadMiles;
    
    // Update totalMiles if either changed
    if (input.loadedMiles !== undefined || input.deadheadMiles !== undefined) {
      const lm = input.loadedMiles ?? existing.loadedMiles ?? 0;
      const dm = input.deadheadMiles ?? existing.deadheadMiles ?? 0;
      dataToUpdate.totalMiles = lm + dm;
    }
    
    const mergedForRate: CreateLoadInput = {
      driverId: input.driverId ?? existing.driverId ?? '',
      truckId: input.truckId ?? existing.truckId ?? '',
      brokerName: input.brokerName ?? existing.brokerName,
      pickupAddress: input.pickupAddress ?? existing.pickupLocation,
      pickupCity: input.pickupCity ?? existing.pickupLocation.split(', ')[0] ?? '',
      pickupState: input.pickupState ?? existing.pickupLocation.split(', ')[1] ?? '',
      pickupDate: input.pickupDate ?? existing.pickupDate,
      deliveryAddress: input.deliveryAddress ?? existing.deliveryLocation,
      deliveryCity: input.deliveryCity ?? existing.deliveryLocation.split(', ')[0] ?? '',
      deliveryState: input.deliveryState ?? existing.deliveryLocation.split(', ')[1] ?? '',
      deliveryDate: input.deliveryDate ?? existing.deliveryDate ?? new Date(),
      loadedMiles: input.loadedMiles ?? existing.loadedMiles ?? 0,
      deadheadMiles: input.deadheadMiles ?? existing.deadheadMiles ?? 0,
      rateCents: input.rateCents ?? existing.rateTotal,
      rateType: input.rateType ?? (existing.rateMiles ? 'PER_MILE' : 'FLAT'),
      detentionCents: input.detentionCents ?? existing.detentionPay ?? 0,
      lumperCents: input.lumperCents ?? existing.lumperFee ?? 0,
      otherChargesCents: input.otherChargesCents ?? existing.fuelSurcharge ?? 0,
    };

    if (
      input.rateCents !== undefined ||
      input.rateType !== undefined ||
      input.loadedMiles !== undefined ||
      input.deadheadMiles !== undefined
    ) {
      dataToUpdate.rateTotal = this.calculateTotalCents({
        ...mergedForRate,
        detentionCents: 0,
        lumperCents: 0,
        otherChargesCents: 0,
      });
      if (mergedForRate.rateType === 'PER_MILE') {
        dataToUpdate.rateMiles = mergedForRate.rateCents;
      }
    }

    if (input.detentionCents !== undefined) dataToUpdate.detentionPay = input.detentionCents;
    if (input.lumperCents !== undefined) dataToUpdate.lumperFee = input.lumperCents;
    if (input.otherChargesCents !== undefined) dataToUpdate.fuelSurcharge = input.otherChargesCents;
    if (input.notes !== undefined) dataToUpdate.notes = input.notes;
    if (input.status !== undefined) dataToUpdate.status = input.status;
    if (input.actualDeliveryDate !== undefined) dataToUpdate.actualDeliveryDate = input.actualDeliveryDate;

    const nextStatus = (input.status ?? existing.status) as string;
    if (nextStatus === 'DELIVERED') {
      dataToUpdate.actualDeliveryDate =
        input.actualDeliveryDate ??
        input.deliveryDate ??
        existing.actualDeliveryDate ??
        existing.deliveryDate ??
        new Date();
    }

    const updatedLoad = await prisma.load.update({
      where: { id: loadId },
      data: dataToUpdate,
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
        truck: { select: { id: true, unitNumber: true } },
        trailer: { select: { id: true, unitNumber: true } },
      },
    });

    if (input.rateConfirmationDocumentId) {
      await prisma.document.update({
        where: { id: input.rateConfirmationDocumentId },
        data: { loadId: updatedLoad.id },
      });
    }

    return this.mapLoad(updatedLoad);
  }

  async delete(tenantId: string, loadId: string) {
    const existing = await prisma.load.findFirst({
      where: { id: loadId, companyId: tenantId },
      include: {
        settlementLines: {
          include: { settlement: { select: { status: true } } },
        },
        documents: { select: { id: true, fileUrl: true } },
      },
    });
    if (!existing) throw new AppError(404, 'LOAD_NOT_FOUND', 'Load not found');

    const onLockedSettlement = existing.settlementLines.some(
      (line) => line.settlement.status === 'FINALIZED' || line.settlement.status === 'PAID',
    );
    if (onLockedSettlement) {
      throw new AppError(
        409,
        'LOAD_ON_SETTLEMENT',
        'Cannot delete a load that appears on a finalized or paid settlement',
      );
    }

    await prisma.$transaction(async (tx) => {
      if (existing.settlementLines.length > 0) {
        await tx.settlementLine.deleteMany({ where: { loadId } });
      }

      for (const document of existing.documents) {
        await deleteStoredFile(document.fileUrl);
        await tx.document.delete({ where: { id: document.id } });
      }

      await tx.load.delete({ where: { id: loadId } });
    });
  }

  /**
   * Get summary stats for loads
   */
  async getStats(tenantId: string) {
    const [pending, inTransit, delivered] = await Promise.all([
      prisma.load.count({ where: { companyId: tenantId, status: 'PENDING' } }),
      prisma.load.count({ where: { companyId: tenantId, status: 'IN_TRANSIT' } }),
      prisma.load.count({ where: { companyId: tenantId, status: 'DELIVERED' } }),
    ]);

    // Use raw query to avoid Prisma enum issues with aggregate
    const revenueResult = await prisma.$queryRaw<[{ total: bigint | null }]>`
      SELECT COALESCE(SUM("rateTotal" + COALESCE("detentionPay", 0) + COALESCE("lumperFee", 0) + COALESCE("tonuAmount", 0)), 0) as total
      FROM loads
      WHERE "companyId" = ${tenantId}
      AND status = 'DELIVERED'
    `;

    return {
      pending,
      inTransit,
      delivered,
      totalRevenueCents: Number(revenueResult[0]?.total || 0),
    };
  }
}

export const loadsService = new LoadsService();
