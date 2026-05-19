import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { CreateTruckInput, UpdateTruckInput } from './trucks.schema';

export class TrucksService {
  async list(tenantId: string, status?: string, search?: string, page = 1, limit = 20) {
    const where: any = { companyId: tenantId };
    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { unitNumber: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
        { vin: { contains: search, mode: 'insensitive' } },
        { licensePlate: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [trucks, total] = await Promise.all([
      prisma.truck.findMany({
        where,
        include: {
          ownerDriver: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { loads: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.truck.count({ where }),
    ]);
    return { trucks, total };
  }

  async getById(tenantId: string, truckId: string) {
    const truck = await prisma.truck.findFirst({
      where: { id: truckId, companyId: tenantId },
      include: {
        ownerDriver: { select: { id: true, firstName: true, lastName: true, driverType: true } },
        documents: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { loads: true } },
      },
    });
    if (!truck) throw new AppError(404, 'TRUCK_NOT_FOUND', 'Truck not found');
    return truck;
  }

  async create(tenantId: string, input: CreateTruckInput) {
    return prisma.truck.create({
      data: { companyId: tenantId, ...input },
      include: { ownerDriver: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(tenantId: string, truckId: string, input: UpdateTruckInput) {
    const existing = await prisma.truck.findFirst({ where: { id: truckId, companyId: tenantId } });
    if (!existing) throw new AppError(404, 'TRUCK_NOT_FOUND', 'Truck not found');
    return prisma.truck.update({
      where: { id: truckId },
      data: input,
      include: { ownerDriver: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async delete(tenantId: string, truckId: string) {
    const existing = await prisma.truck.findFirst({ where: { id: truckId, companyId: tenantId } });
    if (!existing) throw new AppError(404, 'TRUCK_NOT_FOUND', 'Truck not found');
    await prisma.truck.update({ where: { id: truckId }, data: { isActive: false } });
  }

  getComplianceStatus(truck: any) {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const getStatus = (d: Date) => {
      const date = new Date(d);
      if (date < now) return 'RED';
      if (date <= thirtyDays) return 'YELLOW';
      return 'GREEN';
    };
    return {
      dotInspection: { status: getStatus(truck.dotInspectionExpiry), expiryDate: truck.dotInspectionExpiry, label: 'DOT Inspection' },
      irp: { status: getStatus(truck.irpExpiry), expiryDate: truck.irpExpiry, label: 'IRP Registration' },
      hvut: { status: getStatus(truck.hvutExpiry), expiryDate: truck.hvutExpiry, label: 'Form 2290 (HVUT)' },
      insurance: { status: getStatus(truck.insuranceExpiry), expiryDate: truck.insuranceExpiry, label: 'Insurance' },
    };
  }
}

export const trucksService = new TrucksService();
