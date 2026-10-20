import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';
import {
  AUTH_ENDPOINTS,
  LOGIN_ROUTE,
  SESSION_EXPIRED_PARAM,
} from '../../../auth/constants/auth.constants';
import { API_BASE_URL } from '../../api.config';
import { AuthService } from '../services/auth.service';

const UNAUTHENTICATED_ENDPOINTS = [
  AUTH_ENDPOINTS.login,
  AUTH_ENDPOINTS.refresh,
  AUTH_ENDPOINTS.logout,
];

/**
 * Adds the Bearer token to backend requests. An expiring token is renewed with the refresh token
 * before the request goes out, and a 401 triggers one refresh and a retry. Only when the refresh
 * itself fails is the user sent back to login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isApiRequest = request.url.startsWith(inject(API_BASE_URL));

  if (!isApiRequest || UNAUTHENTICATED_ENDPOINTS.some((path) => request.url.endsWith(path))) {
    return next(request);
  }

  const send = (token: string | null) => next(withToken(request, token));
  const sessionExpired = (error: unknown): Observable<never> => {
    auth.clearSession();
    void router.navigate([LOGIN_ROUTE], {
      queryParams: { returnUrl: router.url, reason: SESSION_EXPIRED_PARAM },
    });
    return throwError(() => error);
  };

  const token$ =
    auth.isTokenExpired() && auth.canRefresh() ? auth.refreshSession() : of(auth.accessToken);

  return token$.pipe(
    catchError(sessionExpired),
    switchMap((token) => send(token)),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      if (!auth.canRefresh()) {
        return sessionExpired(error);
      }
      return auth.refreshSession().pipe(
        catchError(sessionExpired),
        switchMap((token) => send(token)),
        catchError((retryError: unknown) =>
          retryError instanceof HttpErrorResponse && retryError.status === 401
            ? sessionExpired(retryError)
            : throwError(() => retryError),
        ),
      );
    }),
  );
};

function withToken<T>(request: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}
