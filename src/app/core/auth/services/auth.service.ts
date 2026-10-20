import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ACCESS_TOKEN_KEY, AUTH_ENDPOINTS } from '../../../auth/constants/auth.constants';
import { AuthUser, LoginCredentials, LoginResult } from '../../../auth/models/auth.model';
import { API_BASE_URL, apiUrl } from '../../api.config';
import { ApiResponse } from '../../models/api.model';

/**
 * Holds the session: the access token (kept in localStorage so a refresh keeps the user signed in)
 * and the current user loaded from GET /auth/me. The refresh token is not stored; when the access
 * token expires the user signs in again.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly token = signal<string | null>(readStoredToken());
  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.token() !== null);

  get accessToken(): string | null {
    return this.token();
  }

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.http
      .post<ApiResponse<LoginResult>>(apiUrl(this.baseUrl, AUTH_ENDPOINTS.login), credentials)
      .pipe(
        map((response) => response.data),
        tap((result) => {
          this.setToken(result.accessToken);
          this.currentUser.set(result.user);
        }),
        map((result) => result.user),
      );
  }

  loadCurrentUser(): Observable<AuthUser> {
    return this.http.get<ApiResponse<AuthUser>>(apiUrl(this.baseUrl, AUTH_ENDPOINTS.me)).pipe(
      map((response) => response.data),
      tap((user) => this.currentUser.set(user)),
    );
  }

  logout(): void {
    this.setToken(null);
    this.currentUser.set(null);
  }

  isTokenExpired(now = Date.now()): boolean {
    const token = this.token();
    if (!token) {
      return true;
    }
    const expiresAt = readExpiry(token);
    return expiresAt !== null && expiresAt <= now;
  }

  private setToken(token: string | null): void {
    this.token.set(token);
    try {
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    } catch {
      // Storage can be unavailable (private mode); the session then lasts until the tab closes
    }
  }
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Reads the `exp` claim (in ms) from a JWT: null when it has none, 0 (expired) when it can't be read. */
function readExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return 0;
  }
}
