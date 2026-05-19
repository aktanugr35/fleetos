import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { CreateDriverInput, UpdateDriverInput, DriverQueryInput } from './drivers.schema';

export class DriversService {
  /**
   * List drivers with filtering and pagination
   */
  async list(tenantId: string, query: DriverQueryInput) {
    const where: any = { companyId: tenantId };

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;

    if (query.type) where.driverType = query.type;

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { cdlNumber: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          truck: { select: { id: true, unitNumber: true, make: true, model: true } },
          _count: { select: { loads: true, settlements: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.driver.count({ where }),
    ]);

    return { drivers, total };
  }

  /**
   * Get driver by ID
   */
  async getById(tenantId: string, driverId: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId },
      include: {
        truck: true,
        user: { select: { id: true, email: true, role: true, lastLoginAt: true } },
        documents: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { loads: true, settlements: true, deductions: true } },
      },
    });

    if (!driver) {
      throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');
    }

    return driver;
  }

  /**
   * Create a new driver
   */
  async create(tenantId: string, input: CreateDriverInput) {
    const driver = await prisma.driver.create({
      data: {
        companyId: tenantId,
        ...input,
      },
      include: {
        truck: { select: { id: true, unitNumber: true } },
      },
    });

    return driver;
  }

  /**
   * Update a driver
   */
  async update(tenantId: string, driverId: string, input: UpdateDriverInput) {
    // Verify driver belongs to tenant
    const existing = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');
    }

    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: input,
      include: {
        truck: { select: { id: true, unitNumber: true } },
      },
    });

    return driver;
  }

  /**
   * Soft delete a driver (deactivate)
   */
  async delete(tenantId: string, driverId: string) {
    const existing = await prisma.driver.findFirst({
      where: { id: driverId, companyId: tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');
    }

    if (!existing.isActive) {
      throw new AppError(400, 'DRIVER_ALREADY_INACTIVE', 'Driver is already inactive');
    }

    await prisma.$transaction([
      prisma.truck.updateMany({
        where: { companyId: tenantId, ownerDriverId: driverId },
        data: { ownerDriverId: null },
      }),
      prisma.driver.update({
        where: { id: driverId },
        data: { isActive: false },
      }),
    ]);
  }

  /**
   * Get driver loads
   */
  async getLoads(tenantId: string, driverId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [loads, total] = await Promise.all([
      prisma.load.findMany({
        where: { driverId, companyId: tenantId },
        include: {
          truck: { select: { unitNumber: true } },
          trailer: { select: { unitNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.load.count({ where: { driverId, companyId: tenantId } }),
    ]);

    return { loads, total };
  }

  /**
   * Get driver compliance status
   */
  getComplianceStatus(driver: any) {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const getStatus = (expiryDate: Date) => {
      if (expiryDate < now) return 'RED';
      if (expiryDate <= thirtyDays) return 'YELLOW';
      return 'GREEN';
    };

    return {
      cdl: {
        status: getStatus(new Date(driver.cdlExpiryDate)),
        expiryDate: driver.cdlExpiryDate,
        label: 'CDL License',
      },
      medicalCard: {
        status: getStatus(new Date(driver.medicalCardExpiry)),
        expiryDate: driver.medicalCardExpiry,
        label: 'Medical Card',
      },
    };
  }
}

export const driversService = new DriversService();
