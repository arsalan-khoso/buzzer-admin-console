import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { toHttpParams } from '../../common/utils/http-params.util';
import { API_BASE_URL, apiUrl } from '../../core/api.config';
import { ApiResponse } from '../../core/models/api.model';
import { SPORTS_ENDPOINTS } from '../constants/sports.constants';
import {
  GoverningBody,
  Organisation,
  Participant,
  SquadMember,
  StaffList,
  StaffMember,
  Team,
  UserOption,
} from '../models/hierarchy.model';
import { Sport } from '../models/sport.model';

/** Largest page the API serves; detail tables show one level of the hierarchy. */
const MAX_LIMIT = 100;

@Injectable({ providedIn: 'root' })
export class HierarchyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getSport(id: string): Observable<Sport> {
    return this.get<Sport>(`${SPORTS_ENDPOINTS.sports}/${id}`);
  }

  listGoverningBodies(sportId: string): Observable<GoverningBody[]> {
    return this.get<GoverningBody[]>(SPORTS_ENDPOINTS.governingBodies, {
      sportId,
      limit: MAX_LIMIT,
    });
  }

  getGoverningBody(id: string): Observable<GoverningBody> {
    return this.get<GoverningBody>(`${SPORTS_ENDPOINTS.governingBodies}/${id}`);
  }

  createGoverningBody(input: {
    name: string;
    country?: string;
    sportId: string;
  }): Observable<GoverningBody> {
    return this.post<GoverningBody>(SPORTS_ENDPOINTS.governingBodies, input);
  }

  updateGoverningBody(
    id: string,
    input: { name: string; country?: string },
  ): Observable<GoverningBody> {
    return this.patch<GoverningBody>(`${SPORTS_ENDPOINTS.governingBodies}/${id}`, input);
  }

  deleteGoverningBody(id: string): Observable<void> {
    return this.remove(`${SPORTS_ENDPOINTS.governingBodies}/${id}`);
  }

  listOrganisations(governingBodyId: string): Observable<Organisation[]> {
    return this.get<Organisation[]>(SPORTS_ENDPOINTS.organisations, {
      governingBodyId,
      limit: MAX_LIMIT,
    });
  }

  getOrganisation(id: string): Observable<Organisation> {
    return this.get<Organisation>(`${SPORTS_ENDPOINTS.organisations}/${id}`);
  }

  createOrganisation(input: {
    name: string;
    city?: string;
    governingBodyId: string;
  }): Observable<Organisation> {
    return this.post<Organisation>(SPORTS_ENDPOINTS.organisations, input);
  }

  updateOrganisation(id: string, input: { name: string; city?: string }): Observable<Organisation> {
    return this.patch<Organisation>(`${SPORTS_ENDPOINTS.organisations}/${id}`, input);
  }

  deleteOrganisation(id: string): Observable<void> {
    return this.remove(`${SPORTS_ENDPOINTS.organisations}/${id}`);
  }

  listTeams(organizationId: string): Observable<Team[]> {
    return this.get<Team[]>(SPORTS_ENDPOINTS.teams, { organizationId, limit: MAX_LIMIT });
  }

  createTeam(input: { name: string; organizationId: string }): Observable<Team> {
    return this.post<Team>(SPORTS_ENDPOINTS.teams, input);
  }

  listParticipants(teamId: string): Observable<Participant[]> {
    return this.get<Participant[]>(SPORTS_ENDPOINTS.participants, { teamId, limit: MAX_LIMIT });
  }

  getParticipant(id: string): Observable<Participant> {
    return this.get<Participant>(`${SPORTS_ENDPOINTS.participants}/${id}`);
  }

  createParticipant(input: {
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    position?: string;
    teamId: string;
  }): Observable<Participant> {
    return this.post<Participant>(SPORTS_ENDPOINTS.participants, input);
  }

  updateParticipant(
    id: string,
    input: {
      firstName: string;
      lastName: string;
      jerseyNumber?: number;
      position?: string;
      teamId: string;
    },
  ): Observable<Participant> {
    return this.patch<Participant>(`${SPORTS_ENDPOINTS.participants}/${id}`, input);
  }

  deleteParticipant(id: string): Observable<void> {
    return this.remove(`${SPORTS_ENDPOINTS.participants}/${id}`);
  }

  listSquad(organisationId: string): Observable<SquadMember[]> {
    return this.get<SquadMember[]>(`organizations/${organisationId}/squad`);
  }

  addSquadMember(
    organisationId: string,
    input: { userId: string; position: string; agreementEnd?: string | null },
  ): Observable<SquadMember> {
    return this.post<SquadMember>(`organizations/${organisationId}/squad`, input);
  }

  updateSquadMember(
    id: string,
    input: { position: string; agreementEnd: string | null },
  ): Observable<SquadMember> {
    return this.patch<SquadMember>(`squad/${id}`, input);
  }

  removeSquadMember(id: string): Observable<void> {
    return this.remove(`squad/${id}`);
  }

  listStaff(organisationId: string): Observable<StaffList> {
    return this.get<StaffList>(`organizations/${organisationId}/staff`);
  }

  addStaffMember(organisationId: string, input: Omit<StaffMember, 'id'>): Observable<StaffMember> {
    return this.post<StaffMember>(`organizations/${organisationId}/staff`, input);
  }

  updateStaffMember(id: string, input: Omit<StaffMember, 'id'>): Observable<StaffMember> {
    return this.patch<StaffMember>(`staff/${id}`, input);
  }

  removeStaffMember(id: string): Observable<void> {
    return this.remove(`staff/${id}`);
  }

  searchUsers(search: string): Observable<UserOption[]> {
    return this.get<UserOption[]>('users', { search, limit: 20 });
  }

  private get<T>(path: string, query: object = {}): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(apiUrl(this.baseUrl, path), { params: toHttpParams(query) })
      .pipe(map((response) => response.data));
  }

  private post<T>(path: string, body: object): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(apiUrl(this.baseUrl, path), body)
      .pipe(map((response) => response.data));
  }

  private patch<T>(path: string, body: object): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(apiUrl(this.baseUrl, path), body)
      .pipe(map((response) => response.data));
  }

  private remove(path: string): Observable<void> {
    return this.http.delete(apiUrl(this.baseUrl, path)).pipe(map(() => undefined));
  }
}
