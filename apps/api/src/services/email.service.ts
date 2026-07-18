import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Minimal Resend email sender using the REST API (no SDK dependency).
 * Silently no-ops when RESEND_API_KEY is not configured.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    logger.info(`✉️  Email skipped (no RESEND_API_KEY): "${input.subject}"`);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text && { text: input.text }),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error(`✉️  Email send failed (${res.status}): ${body}`);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('✉️  Email send error:', error);
    return false;
  }
}

export function isEmailEnabled(): boolean {
  return Boolean(env.RESEND_API_KEY);
}
