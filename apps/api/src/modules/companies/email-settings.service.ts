import type { CompanyEmailSettings } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { encryptSecret } from '../../services/credentials-crypto.service';
import { sendCompanyMail } from '../../services/smtp-mailer.service';
import type { UpsertEmailSettingsInput } from './email-settings.schema';

function toResponse(settings: CompanyEmailSettings | null) {
  if (!settings) return { configured: false, settings: null };
  const { smtpPasswordEnc: _password, companyId: _companyId, ...rest } = settings;
  return { configured: true, settings: { ...rest, hasPassword: Boolean(_password) } };
}

export const emailSettingsService = {
  async get(companyId: string) {
    return toResponse(await prisma.companyEmailSettings.findUnique({ where: { companyId } }));
  },

  async upsert(companyId: string, input: UpsertEmailSettingsInput) {
    const existing = await prisma.companyEmailSettings.findUnique({ where: { companyId } });
    const password = input.smtpPassword?.length ? input.smtpPassword : null;
    if (!existing && !password) {
      throw new AppError(400, 'SMTP_PASSWORD_REQUIRED', 'Enter the SMTP password');
    }

    const data = {
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUser: input.smtpUser,
      fromEmail: input.fromEmail,
      fromName: input.fromName,
      replyTo: input.replyTo,
      factoringEmail: input.factoringEmail,
      inHouseFinanceEmail: input.inHouseFinanceEmail,
      ...(password && { smtpPasswordEnc: encryptSecret(password) }),
      lastTestedAt: null,
      lastTestError: null,
    };

    const saved = existing
      ? await prisma.companyEmailSettings.update({ where: { companyId }, data })
      : await prisma.companyEmailSettings.create({
          data: { ...data, companyId, smtpPasswordEnc: encryptSecret(password!) },
        });
    return toResponse(saved);
  },

  async remove(companyId: string) {
    await prisma.companyEmailSettings.deleteMany({ where: { companyId } });
    return toResponse(null);
  },

  async sendTest(companyId: string, to: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    try {
      await sendCompanyMail(companyId, {
        to,
        subject: `Test email from ${company?.name ?? 'Haulyard'}`,
        text: 'Your email server settings work. Emails from Haulyard will be sent from this address.',
      });
    } catch (error) {
      if (error instanceof AppError && error.code === 'SMTP_SEND_FAILED') {
        await prisma.companyEmailSettings.update({
          where: { companyId },
          data: { lastTestedAt: new Date(), lastTestError: error.message.slice(0, 500) },
        });
      }
      throw error;
    }
    await prisma.companyEmailSettings.update({
      where: { companyId },
      data: { lastTestedAt: new Date(), lastTestError: null },
    });
    return { sent: true };
  },
};
