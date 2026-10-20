import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../api.config';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const BASE_URL = 'https://api.test/api';

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

  it('should attach the bearer token to backend requests', () => {
    auth.login({ email: 'a@b.c', password: 'x' }).subscribe();
    backend
      .expectOne(`${BASE_URL}/auth/login`)
      .flush({ success: true, data: { accessToken: 'token-1', refreshToken: 'r', user: {} } });

    http.get(`${BASE_URL}/auth/me`).subscribe();
    const request = backend.expectOne(`${BASE_URL}/auth/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-1');
    request.flush({});
  });

  it('should not send the token to other hosts', () => {
    localStorage.setItem('accessToken', 'token-1');
    http.get('https://other.test/data').subscribe();
    const request = backend.expectOne('https://other.test/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('should sign out and redirect to login on 401', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const logout = vi.spyOn(auth, 'logout');

    http.get(`${BASE_URL}/organizations/sports`).subscribe({ error: () => undefined });
    backend
      .expectOne(`${BASE_URL}/organizations/sports`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });
});
