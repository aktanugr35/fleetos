declare module '@sentry/nextjs' {
  export function init(options: {
    dsn?: string;
    environment?: string;
    tracesSampleRate?: number;
  }): void;
}
