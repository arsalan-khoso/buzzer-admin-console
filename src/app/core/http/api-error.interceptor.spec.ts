import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NoticeService } from '../../common/services/notice.service';
import { FORBIDDEN_MESSAGE, TOO_MANY_REQUESTS_MESSAGE } from '../../common/utils/http-error.util';
import { API_BASE_URL } from '../api.config';
import { RATE_LIMIT_RETRY_MS, apiErrorInterceptor } from './api-error.interceptor';

const BASE_URL = 'https://api.test/api';
const URL = `${BASE_URL}/matches`;

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let notices: NoticeService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE_URL },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    notices = TestBed.inject(NoticeService);
  });

  afterEach(() => {
    backend.verify();
    notices.dismiss();
    vi.useRealTimers();
  });

  const tooMany = { status: 429, statusText: 'Too Many Requests' };

  it('should retry a rate-limited read once and succeed quietly', () => {
    let result: unknown;
    http.get(URL).subscribe((value) => (result = value));
    backend.expectOne(URL).flush({}, tooMany);
    expect(notices.notice()).toBeNull();

    vi.advanceTimersByTime(RATE_LIMIT_RETRY_MS);
    backend.expectOne(URL).flush({ ok: true });
    expect(result).toEqual({ ok: true });
    expect(notices.notice()).toBeNull();
  });

  it('should show the retry message when the read is still rate-limited', () => {
    let failed = false;
    http.get(URL).subscribe({ error: () => (failed = true) });
    backend.expectOne(URL).flush({}, tooMany);
    vi.advanceTimersByTime(RATE_LIMIT_RETRY_MS);
    backend.expectOne(URL).flush({}, tooMany);

    expect(failed).toBe(true);
    expect(notices.notice()?.message).toBe(TOO_MANY_REQUESTS_MESSAGE);
  });

  it('should never send a write twice', () => {
    let failed = false;
    http.post(URL, {}).subscribe({ error: () => (failed = true) });
    backend.expectOne(URL).flush({}, tooMany);
    expect(failed).toBe(true);
    expect(notices.notice()?.message).toBe(TOO_MANY_REQUESTS_MESSAGE);

    vi.advanceTimersByTime(RATE_LIMIT_RETRY_MS * 2);
    backend.expectNone(URL);
  });

  it('should show the not-allowed message for a 403 and pass the error on', () => {
    let status = 0;
    http.patch(`${URL}/1/status`, {}).subscribe({ error: (error) => (status = error.status) });
    backend.expectOne(`${URL}/1/status`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(notices.notice()?.message).toBe(FORBIDDEN_MESSAGE);
  });

  it('should leave other errors to the page', () => {
    http.get(URL).subscribe({ error: () => undefined });
    backend.expectOne(URL).flush({}, { status: 404, statusText: 'Not Found' });
    expect(notices.notice()).toBeNull();
  });

  it('should hide the notice after a few seconds', () => {
    notices.show('Hello');
    vi.advanceTimersByTime(6000);
    expect(notices.notice()).toBeNull();
  });
});
