import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import type { CreateTrailerInput, UpdateTrailerInput } from './trailers.schema';

export class TrailersService {
  async list(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { companyId: tenantId, isActive: true };
    const [trailers, total] = await Promise.all([
      prisma.trailer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { _count: { select: { loads: true } } } }),
      prisma.trailer.count({ where }),
    ]);
    return { trailers, total };
  }

  async getById(tenantId: string, id: string) {
    const trailer = await prisma.trailer.findFirst({ where: { id, companyId: tenantId }, include: { documents: { take: 10 }, _count: { select: { loads: true } } } });
    if (!trailer) throw new AppError(404, 'TRAILER_NOT_FOUND', 'Trailer not found');
    return trailer;
  }

  async create(tenantId: string, input: CreateTrailerInput) {
    return prisma.trailer.create({ data: { companyId: tenantId, ...input } });
  }

  async update(tenantId: string, id: string, input: UpdateTrailerInput) {
    const existing = await prisma.trailer.findFirst({ where: { id, companyId: tenantId } });
    if (!existing) throw new AppError(404, 'TRAILER_NOT_FOUND', 'Trailer not found');
    return prisma.trailer.update({ where: { id }, data: input });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.trailer.findFirst({ where: { id, companyId: tenantId } });
    if (!existing) throw new AppError(404, 'TRAILER_NOT_FOUND', 'Trailer not found');
    await prisma.trailer.update({ where: { id }, data: { isActive: false } });
  }
}

export const trailersService = new TrailersService();
