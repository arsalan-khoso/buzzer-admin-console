import { HttpErrorResponse } from '@angular/common/http';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/** Turns an HTTP error into a message that can be shown to the user. */
export function httpErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  if (error.status === 403) {
    return 'Your account does not have permission to do this.';
  }
  const body = error.error as { error?: { message?: string } } | null;
  return body?.error?.message ?? fallback;
}
