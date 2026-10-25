import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import {
  HOME_ROUTE,
  LOGIN_ROUTE,
  SESSION_EXPIRED_PARAM,
} from '../../../auth/constants/auth.constants';
import { AuthService } from '../services/auth.service';

/**
 * Lets signed-in users through, loading their role (GET /auth/me) and permissions
 * (GET /users/:id/permissions) on the first visit, so pages render with the right actions.
 * An expired access token is renewed by the interceptor, so only a failed refresh ends here.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree([LOGIN_ROUTE], { queryParams: { returnUrl: state.url } });
  }
  const hasSession = auth.currentUser() && auth.permissions() !== null;
  if (hasSession && (!auth.isTokenExpired() || auth.canRefresh())) {
    return true;
  }
  return auth.loadSession().pipe(
    map(() => true),
    catchError(() =>
      of(
        router.createUrlTree([LOGIN_ROUTE], {
          queryParams: { returnUrl: state.url, reason: SESSION_EXPIRED_PARAM },
        }),
      ),
    ),
  );
};

/** Keeps signed-in users away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const hasLiveSession = auth.isAuthenticated() && (!auth.isTokenExpired() || auth.canRefresh());
  return hasLiveSession ? inject(Router).createUrlTree([HOME_ROUTE]) : true;
};
