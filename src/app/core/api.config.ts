import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** Backend base URL (already includes `/api`). Inject this instead of importing the environment. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

/** Joins the base URL with an endpoint path, e.g. apiUrl(base, 'auth/login'). */
export function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
