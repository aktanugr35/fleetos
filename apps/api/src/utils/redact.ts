const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'token',
  'socialsecuritynumber',
  'ssn',
  'secret',
  'credentialsencryptionkey',
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[_-]/g, '');
  return SENSITIVE_KEYS.has(normalized) || normalized.includes('password');
}

/** Deep-clone a request body and replace secrets so logs/audit rows stay usable. */
export function redactSensitive(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? '[redacted]' : redactSensitive(nested);
  }
  return out;
}
