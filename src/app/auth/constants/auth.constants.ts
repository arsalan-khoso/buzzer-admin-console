export const AUTH_ENDPOINTS = {
  login: 'auth/login',
  me: 'auth/me',
  refresh: 'auth/refresh',
  logout: 'auth/logout',
} as const;

export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

/** Refresh the access token this long before it expires, so requests never race the expiry. */
export const TOKEN_EXPIRY_MARGIN_MS = 30_000;

export const LOGIN_ROUTE = '/login';
export const HOME_ROUTE = '/dashboard';

/** Query param the interceptor adds when it sends the user back to login. */
export const SESSION_EXPIRED_PARAM = 'expired';
