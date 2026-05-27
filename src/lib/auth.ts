'use client';
import Cookies from 'js-cookie';
import { AuthUser } from './types';

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';
const COOKIE_OPTS = { expires: 7, sameSite: 'strict' as const };

export function saveAuth(token: string, user: AuthUser) {
  Cookies.set(TOKEN_KEY, token, COOKIE_OPTS);
  Cookies.set(USER_KEY, JSON.stringify(user), COOKIE_OPTS);
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(USER_KEY);
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = Cookies.get(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
