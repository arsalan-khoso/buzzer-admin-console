import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { toHttpParams } from '../../common/utils/http-params.util';
import { API_BASE_URL, apiUrl } from '../../core/api.config';
import { ApiResponse, ListQuery, Page } from '../../core/models/api.model';
import { PAYMENTS_ENDPOINTS } from '../constants/payments.constants';
import { PaymentStatus, PaymentSummary, Transaction } from '../models/payment.model';

export interface TransactionQuery extends ListQuery {
  status?: PaymentStatus | '';
  currency?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Counts and totals per status plus gross revenue, already formatted by the backend. */
  summary(): Observable<PaymentSummary> {
    return this.http
      .get<ApiResponse<PaymentSummary>>(this.url(PAYMENTS_ENDPOINTS.summary))
      .pipe(map((response) => response.data));
  }

  /** Status, currency, search, sorting and paging all run on the server. */
  list(query: TransactionQuery): Observable<Page<Transaction>> {
    return this.http
      .get<ApiResponse<Transaction[]>>(this.url(PAYMENTS_ENDPOINTS.transactions), {
        params: toHttpParams(query),
      })
      .pipe(
        map((response) => ({
          items: response.data,
          meta: response.meta ?? {
            page: 1,
            limit: response.data.length,
            total: response.data.length,
            totalPages: 1,
          },
        })),
      );
  }

  get(id: string): Observable<Transaction> {
    return this.http
      .get<ApiResponse<Transaction>>(this.url(`${PAYMENTS_ENDPOINTS.transactions}/${id}`))
      .pipe(map((response) => response.data));
  }

  /** ADMIN and OPERATOR only; other roles get 403. */
  changeStatus(id: string, status: PaymentStatus): Observable<Transaction> {
    return this.http
      .patch<ApiResponse<Transaction>>(
        this.url(`${PAYMENTS_ENDPOINTS.transactions}/${id}/status`),
        { status },
      )
      .pipe(map((response) => response.data));
  }

  private url(path: string): string {
    return apiUrl(this.baseUrl, path);
  }
}
