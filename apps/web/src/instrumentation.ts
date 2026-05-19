export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  } catch {
    // Sentry optional — do not block app startup
  }
}
