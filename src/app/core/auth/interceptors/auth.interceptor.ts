import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import {
  AUTH_ENDPOINTS,
  LOGIN_ROUTE,
  SESSION_EXPIRED_PARAM,
} from '../../../auth/constants/auth.constants';
import { API_BASE_URL } from '../../api.config';
import { AuthService } from '../services/auth.service';

/** Adds the Bearer token to backend requests and sends the user to login on a 401. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isApiRequest = request.url.startsWith(inject(API_BASE_URL));
  const token = auth.accessToken;

  const authorised =
    isApiRequest && token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorised).pipe(
    catchError((error: unknown) => {
      const isLoginRequest = request.url.endsWith(AUTH_ENDPOINTS.login);
      if (
        isApiRequest &&
        !isLoginRequest &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        auth.logout();
        void router.navigate([LOGIN_ROUTE], {
          queryParams: { returnUrl: router.url, reason: SESSION_EXPIRED_PARAM },
        });
      }
      return throwError(() => error);
    }),
  );
};
