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
 * Lets signed-in users through, loading their profile from GET /auth/me on the first visit.
 * An expired access token is renewed by the interceptor, so only a failed refresh ends here.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree([LOGIN_ROUTE], { queryParams: { returnUrl: state.url } });
  }
  if (auth.currentUser() && (!auth.isTokenExpired() || auth.canRefresh())) {
    return true;
  }
  return auth.loadCurrentUser().pipe(
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
