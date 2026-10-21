import assert from 'node:assert';
import { describe, it } from 'node:test';
import { upsertEmailSettingsSchema } from './email-settings.schema';

const valid = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: 'billing@example.com',
  smtpPassword: 'app-password',
  fromEmail: 'billing@example.com',
  fromName: '',
  replyTo: '',
};

describe('upsertEmailSettingsSchema', () => {
  it('accepts a normal SMTP setup and turns blank optional fields into null', () => {
    const parsed = upsertEmailSettingsSchema.parse(valid);
    assert.equal(parsed.fromName, null);
    assert.equal(parsed.replyTo, null);
  });

  it('rejects local hosts and hosts with spaces or schemes', () => {
    for (const smtpHost of ['localhost', '127.0.0.1', 'smtp gmail.com', 'smtp://gmail.com']) {
      assert.equal(upsertEmailSettingsSchema.safeParse({ ...valid, smtpHost }).success, false, smtpHost);
    }
  });

  it('normalizes recipient lists and rejects bad entries', () => {
    const parsed = upsertEmailSettingsSchema.parse({ ...valid, factoringEmail: 'a@x.com; b@y.com ,', inHouseFinanceEmail: '' });
    assert.equal(parsed.factoringEmail, 'a@x.com, b@y.com');
    assert.equal(parsed.inHouseFinanceEmail, null);
    assert.equal(upsertEmailSettingsSchema.safeParse({ ...valid, factoringEmail: 'a@x.com, nope' }).success, false);
  });

  it('rejects an invalid reply-to address', () => {
    assert.equal(upsertEmailSettingsSchema.safeParse({ ...valid, replyTo: 'not-an-email' }).success, false);
  });
});
