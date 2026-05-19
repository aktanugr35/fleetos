import { NotificationType } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';

export interface ComplianceSyncItem {
  id: string;
  entityType: 'DRIVER' | 'TRUCK' | 'TRAILER';
  entityId: string;
  entityName: string;
  itemType: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  daysRemaining: number;
}

function complianceLink(item: ComplianceSyncItem): string {
  if (item.entityType === 'DRIVER') {
    return `/dashboard/drivers/${item.entityId}`;
  }
  return '/dashboard/compliance';
}

export class NotificationsService {
  async list(tenantId: string, userId: string, limit = 30) {
    const where = {
      companyId: tenantId,
      OR: [{ userId: null }, { userId }],
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 50),
      }),
      prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  async markRead(tenantId: string, userId: string, notificationId: string) {
    const row = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        companyId: tenantId,
        OR: [{ userId: null }, { userId }],
      },
    });
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Notification not found');
    }
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllRead(tenantId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        companyId: tenantId,
        isRead: false,
        OR: [{ userId: null }, { userId }],
      },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  /** Create unread alerts for compliance issues (deduped by link while unread). */
  async syncFromCompliance(tenantId: string, items: ComplianceSyncItem[]) {
    const alerts = items.filter((i) => i.status === 'RED' || i.status === 'YELLOW');

    for (const item of alerts) {
      const link = complianceLink(item);
      const existing = await prisma.notification.findFirst({
        where: { companyId: tenantId, link, isRead: false },
      });
      if (existing) continue;

      const type: NotificationType =
        item.status === 'RED' ? 'COMPLIANCE_EXPIRED' : 'COMPLIANCE_WARNING';
      const title =
        item.status === 'RED'
          ? `${item.itemType} expired — ${item.entityName}`
          : `${item.itemType} expiring soon — ${item.entityName}`;
      const body =
        item.status === 'RED'
          ? 'This item is past its expiry date. Review compliance immediately.'
          : `Expires in ${item.daysRemaining} day(s). Schedule renewal before it expires.`;

      await prisma.notification.create({
        data: {
          companyId: tenantId,
          userId: null,
          type,
          title,
          body,
          link,
        },
      });
    }
  }

  async createPdfGenerationFailed(
    tenantId: string,
    settlementId: string,
    statementNumber: string | null
  ) {
    const ref = statementNumber || settlementId.slice(0, 8);
    await prisma.notification.create({
      data: {
        companyId: tenantId,
        userId: null,
        type: NotificationType.SYSTEM,
        title: 'Settlement PDF failed',
        body: `Statement ${ref} was saved as DRAFT but the PDF could not be generated. Open Settlements and use Generate PDF to retry.`,
        link: '/dashboard/settlements',
      },
    });
  }

  async createSettlementReady(
    tenantId: string,
    settlementId: string,
    driverName: string,
    payrollId: string | null,
    statementNumber: string | null
  ) {
    const link = '/dashboard/settlements';
    const existing = await prisma.notification.findFirst({
      where: {
        companyId: tenantId,
        type: 'SETTLEMENT_READY',
        body: { contains: settlementId },
        isRead: false,
      },
    });
    if (existing) return;

    const ref = payrollId || statementNumber || settlementId.slice(0, 8);
    await prisma.notification.create({
      data: {
        companyId: tenantId,
        userId: null,
        type: 'SETTLEMENT_READY',
        title: `Settlement ready — ${driverName}`,
        body: `Statement ${ref} (${settlementId}) has been finalized. Review and mark as paid when complete.`,
        link,
      },
    });
  }
}

export const notificationsService = new NotificationsService();
