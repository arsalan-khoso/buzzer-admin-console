export const AUTH_ENDPOINTS = {
  login: 'auth/login',
  me: 'auth/me',
} as const;

export const ACCESS_TOKEN_KEY = 'accessToken';

export const LOGIN_ROUTE = '/login';
export const HOME_ROUTE = '/dashboard';

/** Query param the interceptor adds when it sends the user back to login. */
export const SESSION_EXPIRED_PARAM = 'expired';
