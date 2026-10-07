import crypto from 'crypto';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type {
  CreateFuelCardInput,
  CreateFuelTransactionInput,
  FuelInvoiceInput,
  CreateTollDeviceInput,
  CreateTollTransactionInput,
  UpdateFuelCardInput,
  UpdateFuelTransactionInput,
  UpdateTollDeviceInput,
  UpdateTollTransactionInput,
} from './fuel-toll.schema';

async function assertTruck(tenantId: string, truckId: string) {
  const truck = await prisma.truck.findFirst({
    where: { id: truckId, companyId: tenantId },
    select: { id: true },
  });
  if (!truck) throw new AppError(404, 'TRUCK_NOT_FOUND', 'Truck not found');
}

function includeTruck() {
  return {
    truck: { select: { id: true, unitNumber: true, make: true, model: true } },
  } as const;
}

export class FuelTollService {
  async listFuelCards(tenantId: string, truckId?: string) {
    return prisma.fuelCard.findMany({
      where: { companyId: tenantId, ...(truckId ? { truckId } : {}) },
      include: includeTruck(),
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createFuelCard(tenantId: string, input: CreateFuelCardInput) {
    await assertTruck(tenantId, input.truckId);
    return prisma.fuelCard.create({
      data: { companyId: tenantId, ...input },
      include: includeTruck(),
    });
  }

  async updateFuelCard(tenantId: string, id: string, input: UpdateFuelCardInput) {
    const existing = await prisma.fuelCard.findFirst({ where: { id, companyId: tenantId } });
    if (!existing) throw new AppError(404, 'FUEL_CARD_NOT_FOUND', 'Fuel card not found');
    if (input.truckId) await assertTruck(tenantId, input.truckId);
    return prisma.fuelCard.update({
      where: { id },
      data: input,
      include: includeTruck(),
    });
  }

  async listTollDevices(tenantId: string, truckId?: string) {
    return prisma.tollDevice.findMany({
      where: { companyId: tenantId, ...(truckId ? { truckId } : {}) },
      include: includeTruck(),
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createTollDevice(tenantId: string, input: CreateTollDeviceInput) {
    await assertTruck(tenantId, input.truckId);
    return prisma.tollDevice.create({
      data: { companyId: tenantId, ...input },
      include: includeTruck(),
    });
  }

  async updateTollDevice(tenantId: string, id: string, input: UpdateTollDeviceInput) {
    const existing = await prisma.tollDevice.findFirst({ where: { id, companyId: tenantId } });
    if (!existing) throw new AppError(404, 'TOLL_DEVICE_NOT_FOUND', 'Toll device not found');
    if (input.truckId) await assertTruck(tenantId, input.truckId);
    return prisma.tollDevice.update({
      where: { id },
      data: input,
      include: includeTruck(),
    });
  }

  async listFuelTransactions(tenantId: string, filters: { truckId?: string; fuelCardId?: string }) {
    return prisma.fuelTransaction.findMany({
      where: { companyId: tenantId, ...filters },
      include: {
        truck: { select: { id: true, unitNumber: true } },
        fuelCard: { select: { id: true, cardNumber: true, displayName: true, provider: true } },
        settlementFuelTransactions: { select: { settlementId: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createFuelTransaction(tenantId: string, input: CreateFuelTransactionInput) {
    const fuelCard = await prisma.fuelCard.findFirst({
      where: { id: input.fuelCardId, companyId: tenantId },
      select: { id: true, truckId: true },
    });
    if (!fuelCard) throw new AppError(404, 'FUEL_CARD_NOT_FOUND', 'Fuel card not found');
    return prisma.fuelTransaction.create({
      data: {
        companyId: tenantId,
        truckId: fuelCard.truckId,
        fuelCardId: fuelCard.id,
        date: input.date,
        fuelType: input.fuelType ?? 'DIESEL',
        merchant: input.merchant,
        gallons: input.gallons,
        grossAmount: input.grossAmount,
        discount: input.discount,
        netAmount: input.grossAmount - input.discount,
        reference: input.reference,
        receiptUrl: input.receiptUrl,
        notes: input.notes,
      },
    });
  }

  async updateFuelTransaction(tenantId: string, id: string, input: UpdateFuelTransactionInput) {
    const existing = await prisma.fuelTransaction.findFirst({
      where: { id, companyId: tenantId },
      include: { settlementFuelTransactions: true },
    });
    if (!existing) throw new AppError(404, 'FUEL_TRANSACTION_NOT_FOUND', 'Fuel transaction not found');
    if (existing.settlementFuelTransactions.length > 0) {
      throw new AppError(409, 'ALREADY_APPLIED', 'Cannot edit a fuel transaction already on a settlement');
    }
    const fuelCard = input.fuelCardId
      ? await prisma.fuelCard.findFirst({ where: { id: input.fuelCardId, companyId: tenantId }, select: { id: true, truckId: true } })
      : null;
    if (input.fuelCardId && !fuelCard) throw new AppError(404, 'FUEL_CARD_NOT_FOUND', 'Fuel card not found');
    const grossAmount = input.grossAmount ?? existing.grossAmount;
    const discount = input.discount ?? existing.discount;
    return prisma.fuelTransaction.update({
      where: { id },
      data: {
        ...(fuelCard && { fuelCardId: fuelCard.id, truckId: fuelCard.truckId }),
        ...(input.date && { date: input.date }),
        ...(input.fuelType && { fuelType: input.fuelType }),
        ...(input.merchant !== undefined && { merchant: input.merchant }),
        ...(input.gallons !== undefined && { gallons: input.gallons }),
        ...(input.grossAmount !== undefined && { grossAmount }),
        ...(input.discount !== undefined && { discount }),
        netAmount: grossAmount - discount,
        ...(input.reference !== undefined && { reference: input.reference }),
        ...(input.receiptUrl !== undefined && { receiptUrl: input.receiptUrl }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
  }

  async deleteFuelTransaction(tenantId: string, id: string) {
    const existing = await prisma.fuelTransaction.findFirst({
      where: { id, companyId: tenantId },
      include: { settlementFuelTransactions: { select: { settlementId: true } } },
    });
    if (!existing) throw new AppError(404, 'FUEL_TRANSACTION_NOT_FOUND', 'Fuel transaction not found');
    if (existing.settlementFuelTransactions.length > 0) {
      throw new AppError(
        409,
        'ALREADY_APPLIED',
        'Cannot delete a fuel transaction already on a settlement',
      );
    }
    await prisma.fuelTransaction.delete({ where: { id } });
  }

  async createFuelInvoice(tenantId: string, input: FuelInvoiceInput) {
    const fuelCard = await this.findFuelCard(tenantId, input.fuelCardId);
    const invoiceId = crypto.randomUUID();
    return prisma.$transaction(
      input.lines.map((line) =>
        prisma.fuelTransaction.create({ data: this.invoiceLineData(tenantId, fuelCard, invoiceId, input, line) }),
      ),
    );
  }

  /** `key` is the invoiceId, or the row id for entries saved before invoices existed. */
  async replaceFuelInvoice(tenantId: string, key: string, input: FuelInvoiceInput) {
    const existing = await this.findUnsettledInvoiceLines(tenantId, key, 'edit');
    const fuelCard = await this.findFuelCard(tenantId, input.fuelCardId);
    return prisma.$transaction(async (tx) => {
      await tx.fuelTransaction.deleteMany({ where: { id: { in: existing.map((row) => row.id) } } });
      return Promise.all(
        input.lines.map((line) =>
          tx.fuelTransaction.create({ data: this.invoiceLineData(tenantId, fuelCard, key, input, line) }),
        ),
      );
    });
  }

  async deleteFuelInvoice(tenantId: string, key: string) {
    const existing = await this.findUnsettledInvoiceLines(tenantId, key, 'delete');
    await prisma.fuelTransaction.deleteMany({ where: { id: { in: existing.map((row) => row.id) } } });
  }

  private async findFuelCard(tenantId: string, fuelCardId: string) {
    const fuelCard = await prisma.fuelCard.findFirst({
      where: { id: fuelCardId, companyId: tenantId },
      select: { id: true, truckId: true },
    });
    if (!fuelCard) throw new AppError(404, 'FUEL_CARD_NOT_FOUND', 'Fuel card not found');
    return fuelCard;
  }

  private async findUnsettledInvoiceLines(tenantId: string, key: string, action: 'edit' | 'delete') {
    const rows = await prisma.fuelTransaction.findMany({
      where: { companyId: tenantId, OR: [{ invoiceId: key }, { id: key }] },
      select: { id: true, _count: { select: { settlementFuelTransactions: true } } },
    });
    if (rows.length === 0) {
      throw new AppError(404, 'FUEL_TRANSACTION_NOT_FOUND', 'Fuel invoice not found');
    }
    if (rows.some((row) => row._count.settlementFuelTransactions > 0)) {
      throw new AppError(409, 'ALREADY_APPLIED', `Cannot ${action} a fuel invoice already on a settlement`);
    }
    return rows;
  }

  private invoiceLineData(
    tenantId: string,
    fuelCard: { id: string; truckId: string },
    invoiceId: string,
    input: FuelInvoiceInput,
    line: FuelInvoiceInput['lines'][number],
  ) {
    return {
      companyId: tenantId,
      truckId: fuelCard.truckId,
      fuelCardId: fuelCard.id,
      invoiceId,
      date: input.date,
      fuelType: line.fuelType,
      merchant: input.merchant,
      reference: input.reference,
      notes: input.notes,
      gallons: line.gallons,
      grossAmount: line.grossAmount,
      discount: line.discount,
      netAmount: line.grossAmount - line.discount,
    };
  }

  async listTollTransactions(tenantId: string, filters: { truckId?: string; tollDeviceId?: string }) {
    return prisma.tollTransaction.findMany({
      where: { companyId: tenantId, ...filters },
      include: {
        truck: { select: { id: true, unitNumber: true } },
        tollDevice: { select: { id: true, deviceNumber: true, displayName: true, provider: true } },
        settlementTollTransactions: { select: { settlementId: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createTollTransaction(tenantId: string, input: CreateTollTransactionInput) {
    const tollDevice = await prisma.tollDevice.findFirst({
      where: { id: input.tollDeviceId, companyId: tenantId },
      select: { id: true, truckId: true },
    });
    if (!tollDevice) throw new AppError(404, 'TOLL_DEVICE_NOT_FOUND', 'Toll device not found');
    return prisma.tollTransaction.create({
      data: {
        companyId: tenantId,
        truckId: tollDevice.truckId,
        tollDeviceId: tollDevice.id,
        date: input.date,
        agency: input.agency,
        location: input.location,
        description: input.description,
        amount: input.amount,
        reference: input.reference,
        receiptUrl: input.receiptUrl,
        notes: input.notes,
      },
    });
  }

  async updateTollTransaction(tenantId: string, id: string, input: UpdateTollTransactionInput) {
    const existing = await prisma.tollTransaction.findFirst({
      where: { id, companyId: tenantId },
      include: { settlementTollTransactions: true },
    });
    if (!existing) throw new AppError(404, 'TOLL_TRANSACTION_NOT_FOUND', 'Toll transaction not found');
    if (existing.settlementTollTransactions.length > 0) {
      throw new AppError(409, 'ALREADY_APPLIED', 'Cannot edit a toll transaction already on a settlement');
    }
    const tollDevice = input.tollDeviceId
      ? await prisma.tollDevice.findFirst({ where: { id: input.tollDeviceId, companyId: tenantId }, select: { id: true, truckId: true } })
      : null;
    if (input.tollDeviceId && !tollDevice) throw new AppError(404, 'TOLL_DEVICE_NOT_FOUND', 'Toll device not found');
    return prisma.tollTransaction.update({
      where: { id },
      data: {
        ...(tollDevice && { tollDeviceId: tollDevice.id, truckId: tollDevice.truckId }),
        ...(input.date && { date: input.date }),
        ...(input.agency !== undefined && { agency: input.agency }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.reference !== undefined && { reference: input.reference }),
        ...(input.receiptUrl !== undefined && { receiptUrl: input.receiptUrl }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
  }

  async deleteTollTransaction(tenantId: string, id: string) {
    const existing = await prisma.tollTransaction.findFirst({
      where: { id, companyId: tenantId },
      include: { settlementTollTransactions: { select: { settlementId: true } } },
    });
    if (!existing) throw new AppError(404, 'TOLL_TRANSACTION_NOT_FOUND', 'Toll transaction not found');
    if (existing.settlementTollTransactions.length > 0) {
      throw new AppError(
        409,
        'ALREADY_APPLIED',
        'Cannot delete a toll transaction already on a settlement',
      );
    }
    await prisma.tollTransaction.delete({ where: { id } });
  }
}

export const fuelTollService = new FuelTollService();
