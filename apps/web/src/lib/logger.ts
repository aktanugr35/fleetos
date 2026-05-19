/** Log errors in development only — avoids noisy console in production. */
export function logErrorDev(context: string, err: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, err);
  }
}
