import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { toHttpParams } from '../../common/utils/http-params.util';
import { API_BASE_URL, apiUrl } from '../../core/api.config';
import { ApiResponse, ListQuery, Page } from '../../core/models/api.model';
import { SPORTS_ENDPOINTS } from '../../sports/constants/sports.constants';
import { Team } from '../../sports/models/hierarchy.model';
import { MATCHES_ENDPOINT, MATCH_DIALOG_OPTIONS_LIMIT } from '../constants/matches.constants';
import { CreateMatchInput, Match, MatchStatus, UpdateMatchInput } from '../models/match.model';

export interface MatchListQuery extends ListQuery {
  status?: MatchStatus | '';
}

@Injectable({ providedIn: 'root' })
export class MatchesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Status, search (matched against the venue), sorting and paging all run on the server. */
  list(query: MatchListQuery): Observable<Page<Match>> {
    return this.http
      .get<ApiResponse<Match[]>>(this.url(MATCHES_ENDPOINT), { params: toHttpParams(query) })
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

  create(input: CreateMatchInput): Observable<Match> {
    return this.http
      .post<ApiResponse<Match>>(this.url(MATCHES_ENDPOINT), input)
      .pipe(map((response) => response.data));
  }

  update(id: string, input: UpdateMatchInput): Observable<Match> {
    return this.http
      .patch<ApiResponse<Match>>(this.url(`${MATCHES_ENDPOINT}/${id}`), input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete: the match disappears from every list. */
  delete(id: string): Observable<void> {
    return this.http.delete(this.url(`${MATCHES_ENDPOINT}/${id}`)).pipe(map(() => undefined));
  }

  teamsForSport(sportId: string): Observable<Team[]> {
    return this.http
      .get<ApiResponse<Team[]>>(this.url(SPORTS_ENDPOINTS.teams), {
        params: toHttpParams({ sportId, limit: MATCH_DIALOG_OPTIONS_LIMIT }),
      })
      .pipe(map((response) => response.data));
  }

  private url(path: string): string {
    return apiUrl(this.baseUrl, path);
  }
}
