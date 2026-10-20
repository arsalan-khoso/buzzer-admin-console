import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { toHttpParams } from '../../common/utils/http-params.util';
import { API_BASE_URL, apiUrl } from '../../core/api.config';
import { ApiResponse, ListQuery, Page } from '../../core/models/api.model';
import { SPORTS_ENDPOINTS } from '../constants/sports.constants';
import { CatalogueTotals, Sport, SportInput } from '../models/sport.model';

@Injectable({ providedIn: 'root' })
export class SportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(query: ListQuery): Observable<Page<Sport>> {
    return this.http
      .get<ApiResponse<Sport[]>>(this.url(SPORTS_ENDPOINTS.sports), { params: toHttpParams(query) })
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

  create(input: SportInput): Observable<Sport> {
    return this.http
      .post<ApiResponse<Sport>>(this.url(SPORTS_ENDPOINTS.sports), input)
      .pipe(map((response) => response.data));
  }

  update(id: string, input: SportInput): Observable<Sport> {
    return this.http
      .patch<ApiResponse<Sport>>(this.url(`${SPORTS_ENDPOINTS.sports}/${id}`), input)
      .pipe(map((response) => response.data));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete(this.url(`${SPORTS_ENDPOINTS.sports}/${id}`))
      .pipe(map(() => undefined));
  }

  /** Each total is the list endpoint's meta.total, fetched with limit=1. */
  totals(): Observable<CatalogueTotals> {
    return forkJoin({
      sports: this.total(SPORTS_ENDPOINTS.sports),
      governingBodies: this.total(SPORTS_ENDPOINTS.governingBodies),
      organisations: this.total(SPORTS_ENDPOINTS.organisations),
      participants: this.total(SPORTS_ENDPOINTS.participants),
    });
  }

  private total(endpoint: string): Observable<number> {
    return this.http
      .get<ApiResponse<unknown[]>>(this.url(endpoint), { params: toHttpParams({ limit: 1 }) })
      .pipe(map((response) => response.meta?.total ?? 0));
  }

  private url(path: string): string {
    return apiUrl(this.baseUrl, path);
  }
}
