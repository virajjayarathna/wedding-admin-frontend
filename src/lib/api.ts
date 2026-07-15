import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 ──────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isOnLoginPage = path === '/login' || path === '/superadmin/login';

        // Only redirect if we're NOT already on a login page.
        // If we are on the login page, let the error propagate so the
        // catch block can show the toast (wrong email/password etc.).
        if (!isOnLoginPage) {
          Cookies.remove('auth_token');
          Cookies.remove('auth_user');
          if (path.startsWith('/dashboard') || path.startsWith('/wedding') || path.startsWith('/guests')) {
            window.location.href = '/login';
          } else {
            window.location.href = '/superadmin/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Helpers ────────────────────────────────────────────────────────────────
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export default api;
