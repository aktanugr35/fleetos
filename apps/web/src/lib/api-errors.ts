import axios from 'axios';

/**
 * Extract a user-facing message from an API error response.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.error?.message;
    if (typeof message === 'string' && message.length > 0) return message;
    // A reverse proxy rejecting an oversized body answers with HTML, so there is no
    // API message to show and axios would otherwise surface "status code 413".
    if (err.response?.status === 413) {
      return 'The photo was too large for the server to accept. Please retake it with a lower camera resolution and try again.';
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
