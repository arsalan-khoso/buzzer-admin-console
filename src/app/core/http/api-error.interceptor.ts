import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timer } from 'rxjs';
import { NoticeService } from '../../common/services/notice.service';
import { FORBIDDEN_MESSAGE, TOO_MANY_REQUESTS_MESSAGE } from '../../common/utils/http-error.util';
import { API_BASE_URL } from '../api.config';

/** Wait before retrying a read the backend rate-limited, when it gives no Retry-After. */
export const RATE_LIMIT_RETRY_MS = 2000;
/** Never wait longer than this for one retry. */
const MAX_RETRY_WAIT_MS = 10_000;

/**
 * Makes "not allowed" (403) and "too many requests" (429) clear on every page:
 * - a GET that hits the rate limit is retried once after a short wait;
 * - a 403, or a 429 that is still there, shows an app-wide notice. The page that made the request
 *   still gets the error and shows it in place, so nothing is left half-loaded.
 * Writes are never retried, so a create or a status change is not sent twice.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(inject(API_BASE_URL))) {
    return next(request);
  }
  const notices = inject(NoticeService);
  const isRead = request.method === 'GET';

  return next(request).pipe(
    retry({
      count: isRead ? 1 : 0,
      delay: (error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 429
          ? timer(retryWait(error))
          : throwError(() => error),
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 403) {
          notices.show(FORBIDDEN_MESSAGE);
        } else if (error.status === 429) {
          notices.show(TOO_MANY_REQUESTS_MESSAGE);
        }
      }
      return throwError(() => error);
    }),
  );
};

/** Retry-After in seconds when the backend sends it, otherwise the default wait. */
function retryWait(error: HttpErrorResponse): number {
  const seconds = Number(error.headers?.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1000, MAX_RETRY_WAIT_MS)
    : RATE_LIMIT_RETRY_MS;
}
