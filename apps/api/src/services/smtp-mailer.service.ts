import nodemailer from 'nodemailer';
import type { CompanyEmailSettings } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler.middleware';
import { decryptSecret } from './credentials-crypto.service';
import { logger } from '../utils/logger';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface CompanyMailInput {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
}

function createTransport(settings: CompanyEmailSettings) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: { user: settings.smtpUser, pass: decryptSecret(settings.smtpPasswordEnc) },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
}

/** Sends through the company's own SMTP server configured in Settings. */
export async function sendCompanyMail(companyId: string, input: CompanyMailInput) {
  const settings = await prisma.companyEmailSettings.findUnique({ where: { companyId } });
  if (!settings) {
    throw new AppError(400, 'EMAIL_NOT_CONFIGURED', 'Set up the email server in Settings first');
  }

  try {
    const info = await createTransport(settings).sendMail({
      from: { name: settings.fromName ?? '', address: settings.fromEmail },
      ...(settings.replyTo && { replyTo: settings.replyTo }),
      to: input.to,
      ...(input.cc && { cc: input.cc }),
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
    return { messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`✉️  SMTP send failed for company ${companyId}: ${message}`);
    throw new AppError(502, 'SMTP_SEND_FAILED', `Email server rejected the message: ${message}`);
  }
}
