import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import {
  ACCESS_TOKEN_KEY,
  AUTH_ENDPOINTS,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRY_MARGIN_MS,
} from '../../../auth/constants/auth.constants';
import {
  AuthUser,
  LoginCredentials,
  LoginResult,
  UserPermissions,
} from '../../../auth/models/auth.model';
import { API_BASE_URL, apiUrl } from '../../api.config';
import { ApiResponse } from '../../models/api.model';
import { accessFor } from '../access';

/**
 * Holds the session: the short-lived access token, the refresh token used to renew it (both kept
 * in localStorage so a page refresh keeps the user signed in) and the current user from
 * GET /auth/me. The session ends only when the refresh token itself is rejected.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly access = signal<string | null>(readStored(ACCESS_TOKEN_KEY));
  private readonly refreshToken = signal<string | null>(readStored(REFRESH_TOKEN_KEY));
  /** The refresh request in flight, shared so parallel 401s trigger a single refresh. */
  private pendingRefresh: Observable<string> | null = null;

  readonly currentUser = signal<AuthUser | null>(null);
  /** From GET /users/:id/permissions; null until loaded for this session. */
  readonly permissions = signal<string[] | null>(null);
  /** What the account may do; nothing until the role and permissions are known. */
  readonly capabilities = computed(() =>
    accessFor(this.currentUser()?.role, this.permissions() ?? []),
  );
  readonly isAuthenticated = computed(() => this.access() !== null || this.refreshToken() !== null);

  get accessToken(): string | null {
    return this.access();
  }

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.http
      .post<ApiResponse<LoginResult>>(apiUrl(this.baseUrl, AUTH_ENDPOINTS.login), credentials)
      .pipe(
        map((response) => response.data),
        tap((result) => {
          this.storeTokens(result.accessToken, result.refreshToken);
          this.currentUser.set(result.user);
          // A new account: its permissions are loaded on the way in
          this.permissions.set(null);
        }),
        map((result) => result.user),
      );
  }

  /**
   * Role from GET /auth/me, then the permission list. If the list can't be loaded the console
   * stays read-only rather than showing buttons that could fail.
   */
  loadSession(): Observable<AuthUser> {
    return this.loadCurrentUser().pipe(
      switchMap((user) =>
        this.http
          .get<ApiResponse<UserPermissions>>(
            apiUrl(this.baseUrl, AUTH_ENDPOINTS.permissions(user.id)),
          )
          .pipe(
            map((response) => response.data.permissions),
            catchError(() => of<string[]>([])),
            tap((permissions) => this.permissions.set(permissions)),
            map(() => user),
          ),
      ),
    );
  }

  loadCurrentUser(): Observable<AuthUser> {
    return this.http.get<ApiResponse<AuthUser>>(apiUrl(this.baseUrl, AUTH_ENDPOINTS.me)).pipe(
      map((response) => response.data),
      tap((user) => this.currentUser.set(user)),
    );
  }

  /** True while the refresh token is present and not past its own expiry. */
  canRefresh(): boolean {
    const token = this.refreshToken();
    return token !== null && !isExpired(token, 0);
  }

  /** Exchanges the refresh token for a new token pair and returns the new access token. */
  refreshSession(): Observable<string> {
    if (!this.pendingRefresh) {
      this.pendingRefresh = this.http
        .post<ApiResponse<LoginResult>>(apiUrl(this.baseUrl, AUTH_ENDPOINTS.refresh), {
          refreshToken: this.refreshToken(),
        })
        .pipe(
          map((response) => response.data),
          tap({
            next: (result) => {
              this.storeTokens(result.accessToken, result.refreshToken);
              if (result.user) {
                this.currentUser.set(result.user);
              }
            },
            error: () => this.clearSession(),
          }),
          map((result) => result.accessToken),
          finalize(() => (this.pendingRefresh = null)),
          shareReplay(1),
        );
    }
    return this.pendingRefresh;
  }

  /** Signs out locally and asks the backend to revoke the refresh token. */
  logout(): void {
    const refreshToken = this.refreshToken();
    if (refreshToken) {
      this.http
        .post(apiUrl(this.baseUrl, AUTH_ENDPOINTS.logout), { refreshToken })
        .subscribe({ error: () => undefined });
    }
    this.clearSession();
  }

  clearSession(): void {
    this.storeTokens(null, null);
    this.currentUser.set(null);
    this.permissions.set(null);
  }

  /** True when the access token is missing or about to expire. */
  isTokenExpired(now = Date.now()): boolean {
    const token = this.access();
    return token === null || isExpired(token, TOKEN_EXPIRY_MARGIN_MS, now);
  }

  private storeTokens(access: string | null, refresh: string | null): void {
    this.access.set(access);
    this.refreshToken.set(refresh);
    writeStored(ACCESS_TOKEN_KEY, access);
    writeStored(REFRESH_TOKEN_KEY, refresh);
  }
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null): void {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable (private mode); the session then lasts until the tab closes
  }
}

/** Reads a JWT's `exp` claim; a token that can't be read counts as expired. */
function isExpired(token: string, marginMs: number, now = Date.now()): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 - marginMs <= now;
  } catch {
    return true;
  }
}
