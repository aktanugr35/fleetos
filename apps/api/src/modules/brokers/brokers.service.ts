import { Prisma, LoadStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { normalizeMcNumber } from './brokers.schema';
import type {
  BrokerQueryInput,
  CreateBrokerAgentInput,
  CreateBrokerInput,
  UpdateBrokerAgentInput,
  UpdateBrokerInput,
} from './brokers.schema';

function isDuplicate(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

const agentSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  notes: true,
  isActive: true,
} as const;

/** Revenue we booked through a load, matching the settlement gross. */
const revenueSum = {
  rateTotal: true,
  detentionPay: true,
  lumperFee: true,
  tonuAmount: true,
} as const;

type RevenueSums = {
  rateTotal: number | null;
  detentionPay: number | null;
  lumperFee: number | null;
  tonuAmount: number | null;
};

function sumRevenue(sums: RevenueSums): number {
  return (
    (sums.rateTotal || 0) + (sums.detentionPay || 0) + (sums.lumperFee || 0) + (sums.tonuAmount || 0)
  );
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
        { agents: { some: { name: { contains: search, mode: 'insensitive' } } } },
        ...(digits ? [{ mcNumber: { contains: digits } }] : []),
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [brokers, total] = await Promise.all([
      prisma.broker.findMany({
        where,
        include: { _count: { select: { agents: true, loads: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: query.limit,
      }),
      prisma.broker.count({ where }),
    ]);

    return { brokers, total };
  }

  async getById(tenantId: string, brokerId: string) {
    const broker = await prisma.broker.findFirst({
      where: { id: brokerId, companyId: tenantId },
      include: { agents: { select: agentSelect, orderBy: { name: 'asc' } } },
    });
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
      include: {
        agents: { where: { isActive: true }, select: agentSelect, orderBy: { name: 'asc' } },
      },
    });

    if (!broker) {
      throw new AppError(404, 'BROKER_NOT_FOUND', 'No saved broker with this MC number');
    }

    return broker;
  }

  async create(tenantId: string, input: CreateBrokerInput) {
    try {
      return await prisma.broker.create({ data: { companyId: tenantId, ...input } });
    } catch (error) {
      if (isDuplicate(error)) {
        throw new AppError(409, 'BROKER_MC_EXISTS', 'A broker with this MC number already exists');
      }
      throw error;
    }
  }

  async update(tenantId: string, brokerId: string, input: UpdateBrokerInput) {
    await this.getById(tenantId, brokerId);

    try {
      return await prisma.broker.update({ where: { id: brokerId }, data: input });
    } catch (error) {
      if (isDuplicate(error)) {
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

  /** How much business each agent at this broker brought in. */
  async getSummary(tenantId: string, brokerId: string) {
    const broker = await this.getById(tenantId, brokerId);

    const [grouped, recentLoads] = await Promise.all([
      prisma.load.groupBy({
        by: ['brokerAgentId'],
        where: { companyId: tenantId, brokerId, status: { not: LoadStatus.CANCELLED } },
        _count: { _all: true },
        _sum: revenueSum,
      }),
      prisma.load.findMany({
        where: { companyId: tenantId, brokerId },
        select: {
          id: true,
          loadNumber: true,
          puNumber: true,
          status: true,
          pickupDate: true,
          pickupLocation: true,
          deliveryLocation: true,
          rateTotal: true,
          detentionPay: true,
          lumperFee: true,
          tonuAmount: true,
          brokerAgent: { select: { id: true, name: true } },
          driver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { pickupDate: 'desc' },
        take: 25,
      }),
    ]);

    const statsByAgent = new Map(
      grouped.map((row) => [
        row.brokerAgentId,
        { loadCount: row._count._all, revenueCents: sumRevenue(row._sum) },
      ]),
    );

    const agents = broker.agents.map((agent) => ({
      ...agent,
      loadCount: statsByAgent.get(agent.id)?.loadCount ?? 0,
      revenueCents: statsByAgent.get(agent.id)?.revenueCents ?? 0,
    }));

    const unassigned = statsByAgent.get(null) ?? { loadCount: 0, revenueCents: 0 };
    const totals = grouped.reduce(
      (acc, row) => ({
        loadCount: acc.loadCount + row._count._all,
        revenueCents: acc.revenueCents + sumRevenue(row._sum),
      }),
      { loadCount: 0, revenueCents: 0 },
    );

    return {
      broker: { id: broker.id, name: broker.name, mcNumber: broker.mcNumber, isActive: broker.isActive },
      agents: agents.sort((a, b) => b.revenueCents - a.revenueCents),
      unassigned,
      totals,
      recentLoads: recentLoads.map((load) => ({
        id: load.id,
        loadNumber: load.loadNumber,
        puNumber: load.puNumber,
        status: load.status,
        pickupDate: load.pickupDate,
        pickupLocation: load.pickupLocation,
        deliveryLocation: load.deliveryLocation,
        agentName: load.brokerAgent?.name ?? null,
        driverName: `${load.driver.firstName} ${load.driver.lastName}`.trim(),
        revenueCents: sumRevenue(load),
      })),
    };
  }

  async createAgent(tenantId: string, brokerId: string, input: CreateBrokerAgentInput) {
    await this.getById(tenantId, brokerId);

    try {
      return await prisma.brokerAgent.create({
        data: { brokerId, ...input, email: input.email || null },
        select: agentSelect,
      });
    } catch (error) {
      if (isDuplicate(error)) {
        throw new AppError(409, 'BROKER_AGENT_EXISTS', 'This broker already has an agent with that name');
      }
      throw error;
    }
  }

  async updateAgent(
    tenantId: string,
    brokerId: string,
    agentId: string,
    input: UpdateBrokerAgentInput,
  ) {
    await this.findAgent(tenantId, brokerId, agentId);

    try {
      return await prisma.brokerAgent.update({
        where: { id: agentId },
        data: { ...input, ...(input.email !== undefined ? { email: input.email || null } : {}) },
        select: agentSelect,
      });
    } catch (error) {
      if (isDuplicate(error)) {
        throw new AppError(409, 'BROKER_AGENT_EXISTS', 'This broker already has an agent with that name');
      }
      throw error;
    }
  }

  /** Agents tied to past loads are only deactivated so those loads keep their attribution. */
  async deleteAgent(tenantId: string, brokerId: string, agentId: string) {
    await this.findAgent(tenantId, brokerId, agentId);

    const loadCount = await prisma.load.count({ where: { brokerAgentId: agentId } });
    if (loadCount === 0) {
      await prisma.brokerAgent.delete({ where: { id: agentId } });
      return { removed: true };
    }

    await prisma.brokerAgent.update({ where: { id: agentId }, data: { isActive: false } });
    return { removed: false };
  }

  private async findAgent(tenantId: string, brokerId: string, agentId: string) {
    const agent = await prisma.brokerAgent.findFirst({
      where: { id: agentId, brokerId, broker: { companyId: tenantId } },
    });
    if (!agent) {
      throw new AppError(404, 'BROKER_AGENT_NOT_FOUND', 'Broker agent not found');
    }
    return agent;
  }
}

export const brokersService = new BrokersService();
