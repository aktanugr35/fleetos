import type { BillingMethod, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { sendCompanyMail } from '../../services/smtp-mailer.service';
import { BILLING_METHOD_LABEL, buildBillingSubmissionEmail } from './factoring.email';
import type { FactoringListQuery } from './factoring.schema';

/** Amazon loads are paid through Amazon Relay, so they never go to factoring. */
function billableLoadsWhere(tenantId: string): Prisma.LoadWhereInput {
  return {
    companyId: tenantId,
    status: { not: 'CANCELLED' },
    NOT: { brokerName: { contains: 'amazon', mode: 'insensitive' } },
  };
}

const LOAD_SELECT = {
  id: true,
  loadNumber: true,
  puNumber: true,
  brokerName: true,
  status: true,
  pickupLocation: true,
  deliveryLocation: true,
  pickupDate: true,
  deliveryDate: true,
  actualDeliveryDate: true,
  rateTotal: true,
  detentionPay: true,
  lumperFee: true,
  tonuAmount: true,
  billingMethod: true,
  billingSubmittedAt: true,
  billingSubmittedTo: true,
  driver: { select: { firstName: true, lastName: true } },
} satisfies Prisma.LoadSelect;

type FactoringLoadRow = Prisma.LoadGetPayload<{ select: typeof LOAD_SELECT }>;

function amountCents(load: Pick<FactoringLoadRow, 'rateTotal' | 'detentionPay' | 'lumperFee' | 'tonuAmount'>) {
  return load.rateTotal + (load.detentionPay ?? 0) + (load.lumperFee ?? 0) + (load.tonuAmount ?? 0);
}

function toRow(load: FactoringLoadRow) {
  return {
    id: load.id,
    loadNumber: load.loadNumber,
    puNumber: load.puNumber,
    brokerName: load.brokerName,
    status: load.status,
    pickupLocation: load.pickupLocation,
    deliveryLocation: load.deliveryLocation,
    pickupDate: load.pickupDate,
    deliveryDate: load.actualDeliveryDate ?? load.deliveryDate,
    driverName: load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : '—',
    amountCents: amountCents(load),
    billingMethod: load.billingMethod,
    billingSubmittedAt: load.billingSubmittedAt,
    billingSubmittedTo: load.billingSubmittedTo,
  };
}

export const factoringService = {
  async list(tenantId: string, query: FactoringListQuery) {
    const where: Prisma.LoadWhereInput = { ...billableLoadsWhere(tenantId) };
    if (query.view === 'open') where.billingSubmittedAt = null;
    if (query.view === 'submitted') where.billingSubmittedAt = { not: null };
    if (query.search) {
      where.OR = [
        { loadNumber: { contains: query.search, mode: 'insensitive' } },
        { puNumber: { contains: query.search, mode: 'insensitive' } },
        { brokerName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const openWhere: Prisma.LoadWhereInput = { ...billableLoadsWhere(tenantId), billingSubmittedAt: null };
    const [loads, total, openLoads, settings] = await Promise.all([
      prisma.load.findMany({
        where,
        select: LOAD_SELECT,
        orderBy: { pickupDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.load.count({ where }),
      prisma.load.findMany({
        where: openWhere,
        select: { rateTotal: true, detentionPay: true, lumperFee: true, tonuAmount: true },
      }),
      prisma.companyEmailSettings.findUnique({
        where: { companyId: tenantId },
        select: { factoringEmail: true, inHouseFinanceEmail: true },
      }),
    ]);

    return {
      loads: loads.map(toRow),
      total,
      summary: {
        openCount: openLoads.length,
        openAmountCents: openLoads.reduce((sum, l) => sum + amountCents(l), 0),
        emailConfigured: Boolean(settings),
        factoringEmail: settings?.factoringEmail ?? null,
        inHouseFinanceEmail: settings?.inHouseFinanceEmail ?? null,
      },
    };
  },

  async submit(tenantId: string, loadId: string, method: BillingMethod) {
    const load = await prisma.load.findFirst({
      where: { id: loadId, ...billableLoadsWhere(tenantId) },
      select: LOAD_SELECT,
    });
    if (!load) throw new AppError(404, 'LOAD_NOT_FOUND', 'Load not found');
    if (load.billingSubmittedAt) {
      throw new AppError(409, 'ALREADY_SUBMITTED', 'This load was already submitted');
    }

    const settings = await prisma.companyEmailSettings.findUnique({ where: { companyId: tenantId } });
    const recipients = method === 'FACTORING' ? settings?.factoringEmail : settings?.inHouseFinanceEmail;
    if (!recipients) {
      throw new AppError(
        400,
        'BILLING_EMAIL_NOT_SET',
        `Add the ${BILLING_METHOD_LABEL[method]} email address in Settings → Email first`,
      );
    }

    // Claim the load before emailing so a double click cannot send two emails.
    const claimed = await prisma.load.updateMany({
      where: { id: loadId, companyId: tenantId, billingSubmittedAt: null },
      data: { billingSubmittedAt: new Date(), billingMethod: method, billingSubmittedTo: recipients },
    });
    if (claimed.count === 0) {
      throw new AppError(409, 'ALREADY_SUBMITTED', 'This load was already submitted');
    }

    try {
      const company = await prisma.company.findUnique({ where: { id: tenantId }, select: { name: true } });
      const row = toRow(load);
      const email = buildBillingSubmissionEmail(company?.name ?? 'Haulyard', method, {
        loadNumber: row.loadNumber,
        puNumber: row.puNumber,
        brokerName: row.brokerName,
        pickupLocation: row.pickupLocation,
        deliveryLocation: row.deliveryLocation,
        pickupDate: row.pickupDate,
        deliveryDate: row.deliveryDate,
        driverName: row.driverName,
        amountCents: row.amountCents,
      });
      await sendCompanyMail(tenantId, { to: recipients.split(', '), ...email });
    } catch (error) {
      await prisma.load.update({
        where: { id: loadId },
        data: { billingSubmittedAt: null, billingMethod: null, billingSubmittedTo: null },
      });
      throw error;
    }

    const updated = await prisma.load.findUniqueOrThrow({ where: { id: loadId }, select: LOAD_SELECT });
    return toRow(updated);
  },

  /** Moves a load back to the open list without emailing anyone. */
  async undo(tenantId: string, loadId: string) {
    const result = await prisma.load.updateMany({
      where: { id: loadId, ...billableLoadsWhere(tenantId) },
      data: { billingSubmittedAt: null, billingMethod: null, billingSubmittedTo: null },
    });
    if (result.count === 0) throw new AppError(404, 'LOAD_NOT_FOUND', 'Load not found');
    const updated = await prisma.load.findUniqueOrThrow({ where: { id: loadId }, select: LOAD_SELECT });
    return toRow(updated);
  },
};
