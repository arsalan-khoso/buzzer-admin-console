import { HttpErrorResponse } from '@angular/common/http';
import { httpErrorMessage } from './http-error.util';

describe('httpErrorMessage', () => {
  it('should list the fields a 400 rejected', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        error: { message: 'Validation failed', details: { scheduledAt: ['Invalid date'] } },
      },
    });
    expect(httpErrorMessage(error)).toBe('Validation failed. Scheduled at: Invalid date.');
  });

  it('should return the backend message when there are no details', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: { error: { message: 'Match not found' } },
    });
    expect(httpErrorMessage(error)).toBe('Match not found');
  });

  it('should explain a 403', () => {
    expect(httpErrorMessage(new HttpErrorResponse({ status: 403 }))).toBe(
      'Your account does not have permission to do this.',
    );
  });

  it('should explain a 429 with a retry hint', () => {
    expect(httpErrorMessage(new HttpErrorResponse({ status: 429 }))).toBe(
      'Too many requests (the limit is 300 a minute). Wait a moment, then try again.',
    );
  });
});
