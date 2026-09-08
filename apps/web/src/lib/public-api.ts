import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Unauthenticated API client for public endpoints (driver intake, etc.) */
export const publicApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

publicApi.interceptors.request.use((config) => {
  // Axios must set the multipart boundary itself. A hardcoded Content-Type — including the
  // instance default of application/json — makes nginx/Express mis-read the body.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const headers = config.headers;
    if (headers && typeof headers.delete === 'function') {
      headers.delete('Content-Type');
    } else if (headers) {
      delete (headers as { 'Content-Type'?: string })['Content-Type'];
    }
  }
  return config;
});

export default publicApi;
