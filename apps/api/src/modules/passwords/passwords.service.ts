import type { PasswordCategory } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import {
  buildImportKey,
  decryptSecret,
  encryptSecret,
  normalizeUrl,
} from '../../services/credentials-crypto.service';
import { inferPasswordCategory } from './passwords.catalog';
import type { CreatePasswordInput, ListPasswordsQuery, UpdatePasswordInput } from './passwords.schema';

export interface PasswordDto {
  id: string;
  title: string;
  category: PasswordCategory;
  url: string | null;
  username: string | null;
  password: string;
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function toDto(record: {
  id: string;
  title: string;
  category: PasswordCategory;
  url: string | null;
  username: string | null;
  passwordEncrypted: string;
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): PasswordDto {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    url: record.url,
    username: record.username,
    password: decryptSecret(record.passwordEncrypted),
    notes: record.notes,
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildWhere(tenantId: string, query: ListPasswordsQuery) {
  const where: Record<string, unknown> = { companyId: tenantId };

  if (query.category) {
    where.category = query.category;
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
      { url: { contains: q, mode: 'insensitive' } },
    ];
  }

  return where;
}

export class PasswordsService {
  async list(tenantId: string, query: ListPasswordsQuery = {}) {
    const records = await prisma.companyPassword.findMany({
      where: buildWhere(tenantId, query),
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });

    return records.map(toDto);
  }

  async getById(tenantId: string, id: string) {
    const record = await prisma.companyPassword.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!record) throw new AppError(404, 'PASSWORD_NOT_FOUND', 'Password entry not found');
    return toDto(record);
  }

  async create(tenantId: string, input: CreatePasswordInput) {
    const category = input.category ?? inferPasswordCategory(input.title, input.notes);
    const importKey = buildImportKey(input.title, input.username ?? null, input.notes ?? null);

    const record = await prisma.companyPassword.create({
      data: {
        companyId: tenantId,
        title: input.title.trim(),
        category,
        url: normalizeUrl(input.url),
        username: input.username?.trim() || null,
        passwordEncrypted: encryptSecret(input.password),
        notes: input.notes?.trim() || null,
        importKey,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return toDto(record);
  }

  async update(tenantId: string, id: string, input: UpdatePasswordInput) {
    const existing = await prisma.companyPassword.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!existing) throw new AppError(404, 'PASSWORD_NOT_FOUND', 'Password entry not found');

    const title = input.title?.trim() ?? existing.title;
    const username = input.username !== undefined ? (input.username?.trim() || null) : existing.username;
    const notes = input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes;
    const category =
      input.category ??
      (input.title || input.notes !== undefined
        ? inferPasswordCategory(title, notes)
        : existing.category);

    const importKey = buildImportKey(title, username, notes);

    const record = await prisma.companyPassword.update({
      where: { id },
      data: {
        title,
        category,
        url: input.url !== undefined ? normalizeUrl(input.url) : existing.url,
        username,
        notes,
        importKey,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        ...(input.password ? { passwordEncrypted: encryptSecret(input.password) } : {}),
      },
    });

    return toDto(record);
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.companyPassword.findFirst({
      where: { id, companyId: tenantId },
    });
    if (!existing) throw new AppError(404, 'PASSWORD_NOT_FOUND', 'Password entry not found');
    await prisma.companyPassword.delete({ where: { id } });
  }

  async upsertImportedRow(
    companyId: string,
    row: {
      title: string;
      url?: string | null;
      username?: string | null;
      password: string;
      notes?: string | null;
      sortOrder: number;
    },
  ): Promise<'created' | 'updated'> {
    const title = row.title.trim();
    const username = row.username?.trim() || null;
    const notes = row.notes?.trim() || null;
    const importKey = buildImportKey(title, username, notes);
    const category = inferPasswordCategory(title, notes);

    const existing = await prisma.companyPassword.findUnique({
      where: { companyId_importKey: { companyId, importKey } },
    });

    const data = {
      title,
      category,
      url: normalizeUrl(row.url),
      username,
      passwordEncrypted: encryptSecret(row.password),
      notes,
      sortOrder: row.sortOrder,
      importKey,
    };

    if (existing) {
      await prisma.companyPassword.update({ where: { id: existing.id }, data });
      return 'updated';
    }

    await prisma.companyPassword.create({
      data: { companyId, ...data },
    });
    return 'created';
  }
}

export const passwordsService = new PasswordsService();
