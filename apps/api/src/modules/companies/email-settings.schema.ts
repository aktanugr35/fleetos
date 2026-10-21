import { z } from 'zod';

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().email().safeParse(v).success, 'Enter a valid email address');

/** Comma/semicolon separated list, normalized to "a@x.com, b@y.com" or null. */
const recipientList = z
  .string()
  .max(1000)
  .optional()
  .nullable()
  .transform((v) =>
    (v ?? '')
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .refine((list) => list.length <= 5, 'Up to 5 recipients')
  .refine((list) => list.every((s) => z.string().email().safeParse(s).success), 'Enter valid email addresses separated by commas')
  .transform((list) => (list.length ? list.join(', ') : null));

export const upsertEmailSettingsSchema = z.object({
  smtpHost: z
    .string()
    .trim()
    .min(1, 'SMTP host is required')
    .max(255)
    .regex(/^[a-zA-Z0-9.-]+$/, 'Enter a host name like smtp.gmail.com')
    .refine((v) => !/^(localhost|127\.|0\.0\.0\.0)/i.test(v), 'Local addresses are not allowed'),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim().min(1, 'Username is required').max(255),
  /** Empty or omitted keeps the saved password. */
  smtpPassword: z.string().max(500).optional(),
  fromEmail: z.string().trim().email('Enter a valid sender email').max(254),
  fromName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  replyTo: optionalEmail,
  factoringEmail: recipientList,
  inHouseFinanceEmail: recipientList,
});

export const testEmailSchema = z.object({
  to: z.string().trim().email('Enter a valid recipient email').max(254),
});

export type UpsertEmailSettingsInput = z.infer<typeof upsertEmailSettingsSchema>;
