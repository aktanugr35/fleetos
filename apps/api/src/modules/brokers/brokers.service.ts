import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { normalizeMcNumber } from './brokers.schema';
import type { BrokerQueryInput, CreateBrokerInput, UpdateBrokerInput } from './brokers.schema';

function isDuplicateMc(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export class BrokersService {
  async list(tenantId: string, query: BrokerQueryInput) {
    const where: Prisma.BrokerWhereInput = { companyId: tenantId };

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;

    const search = query.search?.trim();
    if (search) {
      const digits = normalizeMcNumber(search);
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        ...(digits ? [{ mcNumber: { contains: digits } }] : []),
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [brokers, total] = await Promise.all([
      prisma.broker.findMany({ where, orderBy: { name: 'asc' }, skip, take: query.limit }),
      prisma.broker.count({ where }),
    ]);

    return { brokers, total };
  }

  async getById(tenantId: string, brokerId: string) {
    const broker = await prisma.broker.findFirst({ where: { id: brokerId, companyId: tenantId } });
    if (!broker) {
      throw new AppError(404, 'BROKER_NOT_FOUND', 'Broker not found');
    }
    return broker;
  }

  /** Used by the load form to auto-fill broker details from a typed MC number. */
  async lookupByMc(tenantId: string, rawMc: string) {
    const mcNumber = normalizeMcNumber(rawMc ?? '');
    if (mcNumber.length < 3) {
      throw new AppError(400, 'INVALID_MC_NUMBER', 'Enter a valid MC number');
    }

    const broker = await prisma.broker.findFirst({
      where: { companyId: tenantId, mcNumber, isActive: true },
    });

    if (!broker) {
      throw new AppError(404, 'BROKER_NOT_FOUND', 'No saved broker with this MC number');
    }

    return broker;
  }

  async create(tenantId: string, input: CreateBrokerInput) {
    try {
      return await prisma.broker.create({
        data: {
          companyId: tenantId,
          ...input,
          email: input.email || null,
        },
      });
    } catch (error) {
      if (isDuplicateMc(error)) {
        throw new AppError(409, 'BROKER_MC_EXISTS', 'A broker with this MC number already exists');
      }
      throw error;
    }
  }

  async update(tenantId: string, brokerId: string, input: UpdateBrokerInput) {
    await this.getById(tenantId, brokerId);

    try {
      return await prisma.broker.update({
        where: { id: brokerId },
        data: {
          ...input,
          ...(input.email !== undefined ? { email: input.email || null } : {}),
        },
      });
    } catch (error) {
      if (isDuplicateMc(error)) {
        throw new AppError(409, 'BROKER_MC_EXISTS', 'A broker with this MC number already exists');
      }
      throw error;
    }
  }

  async delete(tenantId: string, brokerId: string) {
    const existing = await this.getById(tenantId, brokerId);
    if (!existing.isActive) {
      throw new AppError(400, 'BROKER_ALREADY_INACTIVE', 'Broker is already inactive');
    }

    await prisma.broker.update({ where: { id: brokerId }, data: { isActive: false } });
  }
}

export const brokersService = new BrokersService();
