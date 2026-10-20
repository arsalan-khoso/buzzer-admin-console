import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../api.config';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const BASE_URL = 'https://api.test/api';

/** A JWT-shaped token with the given expiry (seconds since epoch). */
function fakeJwt(label: string, exp: number): string {
  return `h.${btoa(JSON.stringify({ exp, label }))}.s`;
}

const FAR_FUTURE = Math.floor(Date.now() / 1000) + 3600;

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE_URL },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => backend.verify());

  function signIn(access: string, refresh = fakeJwt('refresh-1', FAR_FUTURE)): void {
    auth.login({ email: 'a@b.c', password: 'x' }).subscribe();
    backend
      .expectOne(`${BASE_URL}/auth/login`)
      .flush({ success: true, data: { accessToken: access, refreshToken: refresh, user: {} } });
  }

  it('should attach the bearer token to backend requests', () => {
    const access = fakeJwt('access-1', FAR_FUTURE);
    signIn(access);

    http.get(`${BASE_URL}/auth/me`).subscribe();
    const request = backend.expectOne(`${BASE_URL}/auth/me`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${access}`);
    request.flush({});
  });

  it('should not send the token to other hosts', () => {
    signIn(fakeJwt('access-1', FAR_FUTURE));
    http.get('https://other.test/data').subscribe();
    const request = backend.expectOne('https://other.test/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('should refresh the token and retry once on 401', () => {
    signIn(fakeJwt('access-1', FAR_FUTURE));
    const renewed = fakeJwt('access-2', FAR_FUTURE);

    http.get(`${BASE_URL}/organizations/sports`).subscribe();
    backend
      .expectOne(`${BASE_URL}/organizations/sports`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${BASE_URL}/auth/refresh`).flush({
      success: true,
      data: { accessToken: renewed, refreshToken: fakeJwt('refresh-2', FAR_FUTURE), user: {} },
    });

    const retry = backend.expectOne(`${BASE_URL}/organizations/sports`);
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${renewed}`);
    retry.flush({});
  });

  it('should renew an expired access token before sending the request', () => {
    signIn(fakeJwt('access-1', 1));
    const renewed = fakeJwt('access-2', FAR_FUTURE);

    http.get(`${BASE_URL}/auth/me`).subscribe();
    backend.expectOne(`${BASE_URL}/auth/refresh`).flush({
      success: true,
      data: { accessToken: renewed, refreshToken: fakeJwt('refresh-2', FAR_FUTURE), user: {} },
    });
    const request = backend.expectOne(`${BASE_URL}/auth/me`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${renewed}`);
    request.flush({});
  });

  it('should sign out and redirect to login when the refresh fails', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    signIn(fakeJwt('access-1', FAR_FUTURE));

    http.get(`${BASE_URL}/organizations/sports`).subscribe({ error: () => undefined });
    backend
      .expectOne(`${BASE_URL}/organizations/sports`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne(`${BASE_URL}/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });
});
