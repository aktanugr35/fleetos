import crypto from 'crypto';
import { env, isProdLikeEnv } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function resolveKey(): Buffer {
  const raw = env.CREDENTIALS_ENCRYPTION_KEY ?? env.JWT_ACCESS_SECRET;

  if (isProdLikeEnv() && !env.CREDENTIALS_ENCRYPTION_KEY) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY is required in staging/production');
  }

  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  try {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // fall through to hash
  }

  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credential payload');
  }

  const [ivB64, tagB64, dataB64] = parts;
  const key = resolveKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function buildImportKey(title: string, username: string | null, notes: string | null): string {
  const payload = [
    title.trim().toLowerCase(),
    (username ?? '').trim().toLowerCase(),
    (notes ?? '').trim(),
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
