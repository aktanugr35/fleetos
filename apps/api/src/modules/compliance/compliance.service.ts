import type {
  ComplianceEntityType,
  ComplianceStatus,
  ComplianceType,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import {
  COMPLIANCE_CATALOG,
  CATALOG_BY_KEY,
  LEGACY_BACKFILL,
  type ComplianceTypeDef,
} from './compliance.catalog';

const WARN_DAYS = 30;
const SOON_DAYS = 60;

export interface ComplianceItemDTO {
  id: string;
  recordId: string | null;
  persisted: boolean;
  complianceTypeId: string;
  typeKey: string;
  typeLabel: string;
  category: string;
  trackingMode: string;
  entityType: ComplianceEntityType;
  entityId: string | null;
  entityName: string;
  entitySubtitle: string | null;
  issuedDate: Date | null;
  expiryDate: Date | null;
  lastCompletedAt: Date | null;
  nextDueAt: Date | null;
  effectiveDate: Date | null;
  referenceNumber: string | null;
  notes: string | null;
  documentId: string | null;
  status: ComplianceStatus;
  daysRemaining: number | null;
}

interface EffectiveConfig {
  enabled: boolean;
  cadenceMonths: number | null;
  reminderDays: number[];
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function computeStatus(
  ref: Date | null,
  now: Date,
): { status: ComplianceStatus; daysRemaining: number | null } {
  if (!ref) return { status: 'MISSING', daysRemaining: null };
  const days = Math.floor((ref.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { status: 'EXPIRED', daysRemaining: days };
  if (days <= WARN_DAYS) return { status: 'DUE_SOON', daysRemaining: days };
  return { status: 'VALID', daysRemaining: days };
}

type RecordWithType = Prisma.ComplianceRecordGetPayload<{ include: { complianceType: true } }>;

export class ComplianceService {
  private catalogEnsured = false;

  /** Idempotently upsert the system catalog into the DB. */
  async ensureCatalog(): Promise<void> {
    for (const def of COMPLIANCE_CATALOG) {
      await prisma.complianceType.upsert({
        where: { key: def.key },
        update: {
          label: def.label,
          category: def.category,
          entityType: def.entityType,
          trackingMode: def.trackingMode,
          defaultCadenceMonths: def.defaultCadenceMonths,
          description: def.description,
          sortOrder: def.sortOrder,
          isSystem: true,
        },
        create: {
          key: def.key,
          label: def.label,
          category: def.category,
          entityType: def.entityType,
          trackingMode: def.trackingMode,
          defaultCadenceMonths: def.defaultCadenceMonths,
          description: def.description,
          sortOrder: def.sortOrder,
          isSystem: true,
        },
      });
    }
    this.catalogEnsured = true;
  }

  private async loadTypes(): Promise<ComplianceType[]> {
    let types = await prisma.complianceType.findMany();
    if (types.length === 0 && !this.catalogEnsured) {
      await this.ensureCatalog();
      types = await prisma.complianceType.findMany();
    }
    return types;
  }

  private async getEffectiveConfig(
    tenantId: string,
    types: ComplianceType[],
  ): Promise<Map<string, EffectiveConfig>> {
    const settings = await prisma.companyComplianceSetting.findMany({
      where: { companyId: tenantId },
    });
    const settingByType = new Map(settings.map((s) => [s.complianceTypeId, s]));
    const map = new Map<string, EffectiveConfig>();
    for (const type of types) {
      const def = CATALOG_BY_KEY.get(type.key);
      const setting = settingByType.get(type.id);
      map.set(type.id, {
        enabled: setting?.enabled ?? def?.defaultEnabled ?? true,
        cadenceMonths: setting?.cadenceMonths ?? type.defaultCadenceMonths,
        reminderDays: setting?.reminderDays ?? [60, 30, 14, 7, 1],
      });
    }
    return map;
  }

  private entityRefKey(
    entityType: ComplianceEntityType,
    ids: { driverId?: string | null; truckId?: string | null; trailerId?: string | null },
  ): string {
    if (entityType === 'DRIVER') return `DRIVER:${ids.driverId}`;
    if (entityType === 'TRUCK') return `TRUCK:${ids.truckId}`;
    if (entityType === 'TRAILER') return `TRAILER:${ids.trailerId}`;
    return 'COMPANY';
  }

  /** Build the full merged list of compliance items (persisted + synthesized MISSING). */
  private async buildItems(tenantId: string): Promise<ComplianceItemDTO[]> {
    const now = new Date();
    const types = await this.loadTypes();
    const typeById = new Map(types.map((t) => [t.id, t]));
    const config = await this.getEffectiveConfig(tenantId, types);

    const [drivers, trucks, trailers, company, records] = await Promise.all([
      prisma.driver.findMany({
        where: { companyId: tenantId, isActive: true },
        select: { id: true, firstName: true, lastName: true, driverType: true },
      }),
      prisma.truck.findMany({
        where: { companyId: tenantId, isActive: true },
        select: { id: true, unitNumber: true, make: true, model: true },
      }),
      prisma.trailer.findMany({
        where: { companyId: tenantId, isActive: true },
        select: { id: true, unitNumber: true, make: true, model: true },
      }),
      prisma.company.findUnique({ where: { id: tenantId }, select: { id: true, name: true } }),
      prisma.complianceRecord.findMany({
        where: { companyId: tenantId },
        include: { complianceType: true },
      }),
    ]);

    // Index persisted records by type + entity
    const recordIndex = new Map<string, RecordWithType>();
    for (const r of records) {
      const key = `${r.complianceTypeId}|${this.entityRefKey(r.entityType, r)}`;
      recordIndex.set(key, r);
    }

    const items: ComplianceItemDTO[] = [];

    const pushItem = (
      type: ComplianceType,
      entityType: ComplianceEntityType,
      entityId: string | null,
      entityName: string,
      entitySubtitle: string | null,
    ) => {
      const cfg = config.get(type.id);
      if (!cfg || !cfg.enabled) return;

      const refKeyIds =
        entityType === 'DRIVER'
          ? { driverId: entityId }
          : entityType === 'TRUCK'
            ? { truckId: entityId }
            : entityType === 'TRAILER'
              ? { trailerId: entityId }
              : {};
      const key = `${type.id}|${this.entityRefKey(entityType, refKeyIds)}`;
      const record = recordIndex.get(key);

      if (record) {
        const effectiveDate = record.expiryDate ?? record.nextDueAt;
        const { status, daysRemaining } =
          record.status === 'NA'
            ? { status: 'NA' as ComplianceStatus, daysRemaining: null }
            : computeStatus(effectiveDate, now);
        items.push({
          id: record.id,
          recordId: record.id,
          persisted: true,
          complianceTypeId: type.id,
          typeKey: type.key,
          typeLabel: type.label,
          category: type.category,
          trackingMode: type.trackingMode,
          entityType,
          entityId,
          entityName,
          entitySubtitle,
          issuedDate: record.issuedDate,
          expiryDate: record.expiryDate,
          lastCompletedAt: record.lastCompletedAt,
          nextDueAt: record.nextDueAt,
          effectiveDate,
          referenceNumber: record.referenceNumber,
          notes: record.notes,
          documentId: record.documentId,
          status,
          daysRemaining,
        });
      } else {
        items.push({
          id: `new:${type.key}:${entityType}:${entityId ?? 'company'}`,
          recordId: null,
          persisted: false,
          complianceTypeId: type.id,
          typeKey: type.key,
          typeLabel: type.label,
          category: type.category,
          trackingMode: type.trackingMode,
          entityType,
          entityId,
          entityName,
          entitySubtitle,
          issuedDate: null,
          expiryDate: null,
          lastCompletedAt: null,
          nextDueAt: null,
          effectiveDate: null,
          referenceNumber: null,
          notes: null,
          documentId: null,
          status: 'MISSING',
          daysRemaining: null,
        });
      }
    };

    const typesByEntity = (et: ComplianceEntityType) =>
      types
        .filter((t) => t.entityType === et)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const type of typesByEntity('DRIVER')) {
      for (const d of drivers) {
        pushItem(type, 'DRIVER', d.id, `${d.firstName} ${d.lastName}`,
          d.driverType === 'OWNER_OPERATOR' ? 'Owner Operator' : 'Company Driver');
      }
    }
    for (const type of typesByEntity('TRUCK')) {
      for (const t of trucks) {
        pushItem(type, 'TRUCK', t.id, `Unit ${t.unitNumber}`, `${t.make} ${t.model}`);
      }
    }
    for (const type of typesByEntity('TRAILER')) {
      for (const tr of trailers) {
        pushItem(type, 'TRAILER', tr.id, `Trailer ${tr.unitNumber}`,
          [tr.make, tr.model].filter(Boolean).join(' ') || null);
      }
    }
    if (company) {
      for (const type of typesByEntity('COMPANY')) {
        pushItem(type, 'COMPANY', null, company.name, 'Company-wide');
      }
    }

    return items;
  }

  private static statusRank: Record<ComplianceStatus, number> = {
    EXPIRED: 0,
    DUE_SOON: 1,
    MISSING: 2,
    VALID: 3,
    NA: 4,
  };

  private sortItems(items: ComplianceItemDTO[]): ComplianceItemDTO[] {
    return items.sort((a, b) => {
      const r = ComplianceService.statusRank[a.status] - ComplianceService.statusRank[b.status];
      if (r !== 0) return r;
      const ad = a.daysRemaining ?? Number.POSITIVE_INFINITY;
      const bd = b.daysRemaining ?? Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  }

  /** Dashboard overview: KPIs, compliance score, category & entity breakdown, upcoming. */
  async getOverview(tenantId: string) {
    const items = await this.buildItems(tenantId);
    const now = new Date();
    const soonCutoff = new Date();
    soonCutoff.setDate(soonCutoff.getDate() + SOON_DAYS);

    const tracked = items.filter((i) => i.status !== 'NA');
    const expired = tracked.filter((i) => i.status === 'EXPIRED');
    const dueSoon = tracked.filter((i) => i.status === 'DUE_SOON');
    const missing = tracked.filter((i) => i.status === 'MISSING');
    const valid = tracked.filter((i) => i.status === 'VALID');

    const dueWithin60 = tracked.filter(
      (i) => i.effectiveDate && i.effectiveDate >= now && i.effectiveDate <= soonCutoff,
    ).length;

    const scoreBase = tracked.length || 1;
    const score = Math.round((valid.length / scoreBase) * 100);

    // Category breakdown
    const categoryMap = new Map<string, { total: number; issues: number }>();
    for (const i of tracked) {
      const c = categoryMap.get(i.category) ?? { total: 0, issues: 0 };
      c.total += 1;
      if (i.status === 'EXPIRED' || i.status === 'DUE_SOON' || i.status === 'MISSING') c.issues += 1;
      categoryMap.set(i.category, c);
    }
    const categories = [...categoryMap.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.issues - a.issues || b.total - a.total);

    // Entity breakdown
    const entityCounts = {
      DRIVER: { total: 0, issues: 0 },
      TRUCK: { total: 0, issues: 0 },
      TRAILER: { total: 0, issues: 0 },
      COMPANY: { total: 0, issues: 0 },
    } as Record<ComplianceEntityType, { total: number; issues: number }>;
    for (const i of tracked) {
      entityCounts[i.entityType].total += 1;
      if (i.status === 'EXPIRED' || i.status === 'DUE_SOON' || i.status === 'MISSING') {
        entityCounts[i.entityType].issues += 1;
      }
    }

    const upcoming = this.sortItems(
      tracked.filter((i) => i.status === 'EXPIRED' || i.status === 'DUE_SOON'),
    ).slice(0, 8);

    await this.syncNotifications(tenantId, [...expired, ...dueSoon]);

    return {
      summary: {
        total: tracked.length,
        expired: expired.length,
        dueSoon: dueSoon.length,
        dueWithin60,
        missing: missing.length,
        valid: valid.length,
        score,
      },
      categories,
      entities: entityCounts,
      upcoming,
    };
  }

  /** Filterable, paginated list of compliance items. */
  async list(
    tenantId: string,
    filters: {
      entityType?: ComplianceEntityType;
      category?: string;
      status?: ComplianceStatus;
      typeKey?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    let items = await this.buildItems(tenantId);

    if (filters.entityType) items = items.filter((i) => i.entityType === filters.entityType);
    if (filters.category) items = items.filter((i) => i.category === filters.category);
    if (filters.status) items = items.filter((i) => i.status === filters.status);
    if (filters.typeKey) items = items.filter((i) => i.typeKey === filters.typeKey);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.entityName.toLowerCase().includes(q) ||
          i.typeLabel.toLowerCase().includes(q) ||
          (i.referenceNumber?.toLowerCase().includes(q) ?? false),
      );
    }

    items = this.sortItems(items);

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
    const total = items.length;
    const paged = items.slice((page - 1) * limit, (page - 1) * limit + limit);

    return {
      items: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** All compliance items for a single entity (used by entity profile). */
  async getEntityRecords(
    tenantId: string,
    entityType: ComplianceEntityType,
    entityId: string,
  ) {
    const items = await this.buildItems(tenantId);
    const filtered = items.filter(
      (i) =>
        i.entityType === entityType &&
        (entityType === 'COMPANY' ? true : i.entityId === entityId),
    );
    return this.sortItems(filtered);
  }

  private async resolveType(complianceTypeId?: string, typeKey?: string): Promise<ComplianceType> {
    const type = complianceTypeId
      ? await prisma.complianceType.findUnique({ where: { id: complianceTypeId } })
      : typeKey
        ? await prisma.complianceType.findUnique({ where: { key: typeKey } })
        : null;
    if (!type) throw new AppError(404, 'COMPLIANCE_TYPE_NOT_FOUND', 'Compliance type not found');
    return type;
  }

  private async assertEntity(
    tenantId: string,
    entityType: ComplianceEntityType,
    entityId: string | null,
  ) {
    if (entityType === 'DRIVER') {
      const ok = await prisma.driver.findFirst({ where: { id: entityId!, companyId: tenantId } });
      if (!ok) throw new AppError(404, 'DRIVER_NOT_FOUND', 'Driver not found');
    } else if (entityType === 'TRUCK') {
      const ok = await prisma.truck.findFirst({ where: { id: entityId!, companyId: tenantId } });
      if (!ok) throw new AppError(404, 'TRUCK_NOT_FOUND', 'Truck not found');
    } else if (entityType === 'TRAILER') {
      const ok = await prisma.trailer.findFirst({ where: { id: entityId!, companyId: tenantId } });
      if (!ok) throw new AppError(404, 'TRAILER_NOT_FOUND', 'Trailer not found');
    }
  }

  /**
   * Create or renew a compliance record. Handles both EXPIRY (explicit expiry)
   * and INTERVAL/MILEAGE (completedAt + cadence -> nextDue). Logs an event.
   */
  async upsertRecord(
    tenantId: string,
    userId: string | undefined,
    input: {
      complianceTypeId?: string;
      typeKey?: string;
      entityType: ComplianceEntityType;
      entityId?: string | null;
      expiryDate?: Date | null;
      completedAt?: Date | null;
      issuedDate?: Date | null;
      referenceNumber?: string | null;
      documentId?: string | null;
      notes?: string | null;
    },
  ) {
    const type = await this.resolveType(input.complianceTypeId, input.typeKey);
    const entityType = type.entityType;
    const entityId = entityType === 'COMPANY' ? null : input.entityId ?? null;
    if (entityType !== 'COMPANY' && !entityId) {
      throw new AppError(400, 'ENTITY_REQUIRED', 'Entity id is required for this compliance type');
    }
    await this.assertEntity(tenantId, entityType, entityId);

    // Resolve cadence (company override or type default)
    const setting = await prisma.companyComplianceSetting.findUnique({
      where: { companyId_complianceTypeId: { companyId: tenantId, complianceTypeId: type.id } },
    });
    const cadence = setting?.cadenceMonths ?? type.defaultCadenceMonths;

    const completedAt = input.completedAt ?? new Date();
    let expiryDate: Date | null = null;
    let nextDueAt: Date | null = null;

    if (type.trackingMode === 'EXPIRY') {
      expiryDate = input.expiryDate ?? null;
    } else {
      // INTERVAL / MILEAGE — recurring from completion date
      nextDueAt = input.expiryDate ?? (cadence ? addMonths(completedAt, cadence) : null);
    }

    const whereEntity: Prisma.ComplianceRecordWhereInput = {
      companyId: tenantId,
      complianceTypeId: type.id,
      driverId: entityType === 'DRIVER' ? entityId : null,
      truckId: entityType === 'TRUCK' ? entityId : null,
      trailerId: entityType === 'TRAILER' ? entityId : null,
    };
    const existing = await prisma.complianceRecord.findFirst({ where: whereEntity });

    const effective = expiryDate ?? nextDueAt;
    const { status } = computeStatus(effective, new Date());

    let record;
    if (existing) {
      record = await prisma.complianceRecord.update({
        where: { id: existing.id },
        data: {
          issuedDate: input.issuedDate ?? existing.issuedDate,
          expiryDate,
          nextDueAt,
          lastCompletedAt: completedAt,
          referenceNumber: input.referenceNumber ?? existing.referenceNumber,
          documentId: input.documentId ?? existing.documentId,
          notes: input.notes ?? existing.notes,
          status,
        },
      });
      await prisma.complianceEvent.create({
        data: {
          recordId: record.id,
          action: 'RENEWED',
          completedAt,
          previousExpiry: existing.expiryDate ?? existing.nextDueAt,
          newExpiryDate: effective,
          referenceNumber: input.referenceNumber ?? null,
          documentId: input.documentId ?? null,
          notes: input.notes ?? null,
          performedById: userId ?? null,
        },
      });
    } else {
      record = await prisma.complianceRecord.create({
        data: {
          companyId: tenantId,
          complianceTypeId: type.id,
          entityType,
          driverId: entityType === 'DRIVER' ? entityId : null,
          truckId: entityType === 'TRUCK' ? entityId : null,
          trailerId: entityType === 'TRAILER' ? entityId : null,
          issuedDate: input.issuedDate ?? null,
          expiryDate,
          nextDueAt,
          lastCompletedAt: completedAt,
          referenceNumber: input.referenceNumber ?? null,
          documentId: input.documentId ?? null,
          notes: input.notes ?? null,
          status,
        },
      });
      await prisma.complianceEvent.create({
        data: {
          recordId: record.id,
          action: 'CREATED',
          completedAt,
          newExpiryDate: effective,
          referenceNumber: input.referenceNumber ?? null,
          documentId: input.documentId ?? null,
          notes: input.notes ?? null,
          performedById: userId ?? null,
        },
      });
    }

    await this.syncLegacyField(tenantId, type.key, entityId, effective);
    return record;
  }

  /** Mark an item not applicable (creates/updates the record with NA status). */
  async markNotApplicable(
    tenantId: string,
    userId: string | undefined,
    input: { complianceTypeId?: string; typeKey?: string; entityType: ComplianceEntityType; entityId?: string | null },
  ) {
    const type = await this.resolveType(input.complianceTypeId, input.typeKey);
    const entityType = type.entityType;
    const entityId = entityType === 'COMPANY' ? null : input.entityId ?? null;
    await this.assertEntity(tenantId, entityType, entityId);

    const whereEntity: Prisma.ComplianceRecordWhereInput = {
      companyId: tenantId,
      complianceTypeId: type.id,
      driverId: entityType === 'DRIVER' ? entityId : null,
      truckId: entityType === 'TRUCK' ? entityId : null,
      trailerId: entityType === 'TRAILER' ? entityId : null,
    };
    const existing = await prisma.complianceRecord.findFirst({ where: whereEntity });
    const record = existing
      ? await prisma.complianceRecord.update({ where: { id: existing.id }, data: { status: 'NA' } })
      : await prisma.complianceRecord.create({
          data: {
            companyId: tenantId,
            complianceTypeId: type.id,
            entityType,
            driverId: entityType === 'DRIVER' ? entityId : null,
            truckId: entityType === 'TRUCK' ? entityId : null,
            trailerId: entityType === 'TRAILER' ? entityId : null,
            status: 'NA',
          },
        });
    await prisma.complianceEvent.create({
      data: { recordId: record.id, action: 'MARKED_NA', completedAt: new Date(), performedById: userId ?? null },
    });
    return record;
  }

  async getRecordHistory(tenantId: string, recordId: string) {
    const record = await prisma.complianceRecord.findFirst({
      where: { id: recordId, companyId: tenantId },
      include: { complianceType: true, events: { orderBy: { completedAt: 'desc' } } },
    });
    if (!record) throw new AppError(404, 'RECORD_NOT_FOUND', 'Compliance record not found');
    return record;
  }

  // ─── SETTINGS ───────────────────────────────────────
  async getSettings(tenantId: string) {
    const types = await this.loadTypes();
    const config = await this.getEffectiveConfig(tenantId, types);
    return types
      .map((t) => {
        const cfg = config.get(t.id)!;
        return {
          complianceTypeId: t.id,
          key: t.key,
          label: t.label,
          category: t.category,
          entityType: t.entityType,
          trackingMode: t.trackingMode,
          description: t.description,
          defaultCadenceMonths: t.defaultCadenceMonths,
          sortOrder: t.sortOrder,
          enabled: cfg.enabled,
          cadenceMonths: cfg.cadenceMonths,
          reminderDays: cfg.reminderDays,
        };
      })
      .sort((a, b) => a.entityType.localeCompare(b.entityType) || a.sortOrder - b.sortOrder);
  }

  async updateSetting(
    tenantId: string,
    complianceTypeId: string,
    data: { enabled?: boolean; cadenceMonths?: number | null; reminderDays?: number[] },
  ) {
    const type = await prisma.complianceType.findUnique({ where: { id: complianceTypeId } });
    if (!type) throw new AppError(404, 'COMPLIANCE_TYPE_NOT_FOUND', 'Compliance type not found');
    return prisma.companyComplianceSetting.upsert({
      where: { companyId_complianceTypeId: { companyId: tenantId, complianceTypeId } },
      update: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.cadenceMonths !== undefined && { cadenceMonths: data.cadenceMonths }),
        ...(data.reminderDays !== undefined && { reminderDays: data.reminderDays }),
      },
      create: {
        companyId: tenantId,
        complianceTypeId,
        enabled: data.enabled ?? true,
        cadenceMonths: data.cadenceMonths ?? null,
        reminderDays: data.reminderDays ?? [60, 30, 14, 7, 1],
      },
    });
  }

  // ─── BACKFILL ───────────────────────────────────────
  /** Backfill compliance records from legacy denormalized date fields. */
  async backfillLegacy(tenantId?: string) {
    const types = await this.loadTypes();
    const typeByKey = new Map(types.map((t) => [t.key, t]));
    const companyFilter = tenantId ? { companyId: tenantId } : {};

    const drivers = await prisma.driver.findMany({
      where: { ...companyFilter },
      select: { id: true, companyId: true, cdlExpiryDate: true, medicalCardExpiry: true },
    });
    const trucks = await prisma.truck.findMany({
      where: { ...companyFilter },
      select: {
        id: true, companyId: true,
        dotInspectionExpiry: true, irpExpiry: true, hvutExpiry: true, insuranceExpiry: true,
      },
    });

    let created = 0;

    const ensure = async (
      def: ComplianceTypeDef,
      companyId: string,
      entityType: ComplianceEntityType,
      entityId: string,
      expiry: Date | null,
    ) => {
      if (!expiry) return;
      const type = typeByKey.get(def.key);
      if (!type) return;
      const where: Prisma.ComplianceRecordWhereInput = {
        companyId,
        complianceTypeId: type.id,
        driverId: entityType === 'DRIVER' ? entityId : null,
        truckId: entityType === 'TRUCK' ? entityId : null,
      };
      const existing = await prisma.complianceRecord.findFirst({ where });
      if (existing) return;
      const { status } = computeStatus(expiry, new Date());
      await prisma.complianceRecord.create({
        data: {
          companyId,
          complianceTypeId: type.id,
          entityType,
          driverId: entityType === 'DRIVER' ? entityId : null,
          truckId: entityType === 'TRUCK' ? entityId : null,
          expiryDate: expiry,
          status,
        },
      });
      created += 1;
    };

    for (const d of drivers) {
      for (const def of LEGACY_BACKFILL.filter((x) => x.entityType === 'DRIVER')) {
        const val = def.legacyField ? (d as any)[def.legacyField] : null;
        await ensure(def, d.companyId, 'DRIVER', d.id, val ?? null);
      }
    }
    for (const t of trucks) {
      for (const def of LEGACY_BACKFILL.filter((x) => x.entityType === 'TRUCK')) {
        const val = def.legacyField ? (t as any)[def.legacyField] : null;
        await ensure(def, t.companyId, 'TRUCK', t.id, val ?? null);
      }
    }

    return { created };
  }

  /** Keep legacy Driver/Truck date columns in sync so other screens stay correct. */
  private async syncLegacyField(
    tenantId: string,
    typeKey: string,
    entityId: string | null,
    date: Date | null,
  ) {
    if (!entityId || !date) return;
    const def = CATALOG_BY_KEY.get(typeKey);
    if (!def?.legacyField) return;
    try {
      if (def.entityType === 'DRIVER') {
        await prisma.driver.update({
          where: { id: entityId },
          data: { [def.legacyField]: date },
        });
      } else if (def.entityType === 'TRUCK') {
        await prisma.truck.update({
          where: { id: entityId },
          data: { [def.legacyField]: date },
        });
      }
    } catch {
      /* non-fatal */
    }
  }

  // ─── NOTIFICATIONS / REMINDERS ──────────────────────
  private async syncNotifications(tenantId: string, alertItems: ComplianceItemDTO[]) {
    for (const item of alertItems) {
      const link =
        item.entityType === 'DRIVER' && item.entityId
          ? `/dashboard/drivers/${item.entityId}`
          : '/dashboard/compliance';
      const title =
        item.status === 'EXPIRED'
          ? `${item.typeLabel} expired — ${item.entityName}`
          : `${item.typeLabel} expiring soon — ${item.entityName}`;
      const existing = await prisma.notification.findFirst({
        where: { companyId: tenantId, title, isRead: false },
      });
      if (existing) continue;
      await prisma.notification.create({
        data: {
          companyId: tenantId,
          userId: null,
          type: item.status === 'EXPIRED' ? 'COMPLIANCE_EXPIRED' : 'COMPLIANCE_WARNING',
          title,
          body:
            item.status === 'EXPIRED'
              ? 'This item is past its due date. Resolve compliance immediately.'
              : `Due in ${item.daysRemaining} day(s). Schedule renewal before it lapses.`,
          link,
        },
      });
    }
  }

  /** Company-by-company reminder pass (used by the scheduled job). */
  async collectDueForReminders(tenantId: string) {
    const items = await this.buildItems(tenantId);
    return this.sortItems(items.filter((i) => i.status === 'EXPIRED' || i.status === 'DUE_SOON'));
  }

  /** Create in-app notifications for a company's due items; returns those items. */
  async runRemindersForCompany(tenantId: string) {
    const due = await this.collectDueForReminders(tenantId);
    await this.syncNotifications(tenantId, due);
    return due;
  }

  /**
   * Items eligible for an email digest: anything expired, plus items whose
   * remaining days exactly match a configured reminder threshold (avoids spam).
   */
  async collectReminderEmailItems(tenantId: string) {
    const types = await this.loadTypes();
    const config = await this.getEffectiveConfig(tenantId, types);
    const items = await this.buildItems(tenantId);
    return this.sortItems(
      items.filter((i) => {
        if (i.status === 'EXPIRED') return true;
        if (i.status === 'NA' || i.status === 'MISSING' || i.daysRemaining == null) return false;
        const cfg = config.get(i.complianceTypeId);
        return (cfg?.reminderDays ?? []).includes(i.daysRemaining);
      }),
    );
  }
}

export const complianceService = new ComplianceService();
