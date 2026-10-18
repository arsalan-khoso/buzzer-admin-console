import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { API_BASE_URL, apiUrl } from './api.config';

describe('api config', () => {
  it('should read the base URL from the environment', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe(environment.apiBaseUrl);
  });

  it('should join base URL and path with a single slash', () => {
    expect(apiUrl('https://host/api/', '/auth/login')).toBe('https://host/api/auth/login');
    expect(apiUrl('https://host/api', 'auth/me')).toBe('https://host/api/auth/me');
  });
});
