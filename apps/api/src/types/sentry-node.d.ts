declare module '@sentry/node' {
  export function init(options: {
    dsn?: string;
    environment?: string;
    tracesSampleRate?: number;
  }): void;

  export function captureException(exception: unknown): void;
}
