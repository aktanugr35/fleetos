import axios from 'axios';

/**
 * Extract a user-facing message from an API error response.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.error?.message;
    if (typeof message === 'string' && message.length > 0) return message;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
