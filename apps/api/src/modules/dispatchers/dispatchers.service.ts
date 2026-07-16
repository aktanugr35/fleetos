import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { CreateDispatcherInput, UpdateDispatcherInput, DispatcherQueryInput } from './dispatchers.schema';

export class DispatchersService {
  async list(tenantId: string, query: DispatcherQueryInput) {
    const where: Record<string, unknown> = { companyId: tenantId };

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

    const [dispatchers, total] = await Promise.all([
      prisma.dispatcher.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, role: true, lastLoginAt: true } },
          _count: { select: { bookedLoads: true, dispatcherSettlements: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.dispatcher.count({ where }),
    ]);

    return { dispatchers, total };
  }

  async getById(tenantId: string, dispatcherId: string) {
    const dispatcher = await prisma.dispatcher.findFirst({
      where: { id: dispatcherId, companyId: tenantId },
      include: {
        user: { select: { id: true, email: true, role: true, lastLoginAt: true } },
        _count: { select: { bookedLoads: true, dispatcherSettlements: true } },
      },
    });

    if (!dispatcher) {
      throw new AppError(404, 'DISPATCHER_NOT_FOUND', 'Dispatcher not found');
    }

    return dispatcher;
  }

  async create(tenantId: string, input: CreateDispatcherInput) {
    return prisma.dispatcher.create({
      data: {
        companyId: tenantId,
        ...input,
        email: input.email || null,
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });
  }

  async update(tenantId: string, dispatcherId: string, input: UpdateDispatcherInput) {
    const existing = await prisma.dispatcher.findFirst({
      where: { id: dispatcherId, companyId: tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'DISPATCHER_NOT_FOUND', 'Dispatcher not found');
    }

    return prisma.dispatcher.update({
      where: { id: dispatcherId },
      data: {
        ...input,
        ...(input.email !== undefined ? { email: input.email || null } : {}),
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });
  }

  async delete(tenantId: string, dispatcherId: string) {
    const existing = await prisma.dispatcher.findFirst({
      where: { id: dispatcherId, companyId: tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'DISPATCHER_NOT_FOUND', 'Dispatcher not found');
    }

    if (!existing.isActive) {
      throw new AppError(400, 'DISPATCHER_ALREADY_INACTIVE', 'Dispatcher is already inactive');
    }

    await prisma.dispatcher.update({
      where: { id: dispatcherId },
      data: { isActive: false },
    });
  }
}

export const dispatchersService = new DispatchersService();
