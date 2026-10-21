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
  const body = error.error as {
    error?: { message?: string; details?: Record<string, string[]> };
  } | null;
  const message = body?.error?.message ?? fallback;
  // A 400 lists the rejected fields in details, e.g. { scheduledAt: ['Invalid date'] }
  const details = Object.entries(body?.error?.details ?? {})
    .filter(([, problems]) => Array.isArray(problems) && problems.length)
    .map(([field, problems]) => `${fieldLabel(field)}: ${problems.join(', ')}`);
  return details.length ? `${message}. ${details.join('. ')}.` : message;
}

/** "scheduledAt" -> "Scheduled at" */
function fieldLabel(field: string): string {
  const words = field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
