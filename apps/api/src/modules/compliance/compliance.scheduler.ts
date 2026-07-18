import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { sendEmail, isEmailEnabled } from '../../services/email.service';
import { complianceService, type ComplianceItemDTO } from './compliance.service';

const DAY_MS = 86_400_000;
const BOOT_DELAY_MS = 30_000;

function statusColor(status: string): string {
  if (status === 'EXPIRED') return '#dc2626';
  if (status === 'DUE_SOON') return '#d97706';
  return '#0f766e';
}

function dueLabel(item: ComplianceItemDTO): string {
  if (item.daysRemaining == null) return '—';
  if (item.daysRemaining < 0) return `${Math.abs(item.daysRemaining)} day(s) overdue`;
  return `in ${item.daysRemaining} day(s)`;
}

function buildDigestHtml(companyName: string, items: ComplianceItemDTO[]): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${i.entityName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${i.typeLabel}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${statusColor(i.status)};font-weight:600;">
          ${i.status.replace('_', ' ')}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${dueLabel(i)}</td>
      </tr>`,
    )
    .join('');

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
    <h2 style="margin:0 0 4px;">Compliance reminder — ${companyName}</h2>
    <p style="color:#6b7280;margin:0 0 16px;">${items.length} item(s) need your attention.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="text-align:left;background:#f9fafb;">
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;">Entity</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;">Requirement</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;">Status</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;">Due</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:20px 0;">
      <a href="${env.FRONTEND_URL}/dashboard/compliance"
         style="background:#f5820a;color:#111827;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">
        Open Compliance
      </a>
    </p>
    <p style="color:#9ca3af;font-size:12px;">Haulyard — automated compliance reminders.</p>
  </div>`;
}

export async function runComplianceReminders(): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  for (const company of companies) {
    try {
      // In-app notifications for all currently due items.
      await complianceService.runRemindersForCompany(company.id);

      if (!isEmailEnabled()) continue;

      // Email digest only on configured reminder thresholds.
      const emailItems = await complianceService.collectReminderEmailItems(company.id);
      if (emailItems.length === 0) continue;

      const admins = await prisma.user.findMany({
        where: {
          companyId: company.id,
          role: { in: ['COMPANY_ADMIN', 'SUPER_ADMIN'] },
          isActive: true,
        },
        select: { email: true },
      });
      const recipients = admins.map((a) => a.email).filter(Boolean);
      if (recipients.length === 0) continue;

      await sendEmail({
        to: recipients,
        subject: `[Haulyard] ${emailItems.length} compliance item(s) need attention`,
        html: buildDigestHtml(company.name, emailItems),
      });
    } catch (error) {
      logger.error(`Compliance reminders failed for company ${company.id}:`, error);
    }
  }
}

export function startComplianceReminderScheduler(): void {
  const boot = setTimeout(() => {
    void runComplianceReminders();
  }, BOOT_DELAY_MS);
  boot.unref?.();

  const daily = setInterval(() => {
    void runComplianceReminders();
  }, DAY_MS);
  daily.unref?.();

  logger.info('⏰ Compliance reminder scheduler started');
}
