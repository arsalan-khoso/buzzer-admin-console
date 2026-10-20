import { Routes } from '@angular/router';

export const SPORTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Sport Management',
    loadComponent: () =>
      import('./sport-list/sport-list.component').then((m) => m.SportListComponent),
  },
  {
    path: ':sportId',
    title: 'Sport Management',
    loadComponent: () =>
      import('./sport-detail/sport-detail.component').then((m) => m.SportDetailComponent),
  },
  {
    path: ':sportId/governing-bodies/:governingBodyId',
    title: 'Sport Management',
    loadComponent: () =>
      import('./governing-body-detail/governing-body-detail.component').then(
        (m) => m.GoverningBodyDetailComponent,
      ),
  },
  {
    path: ':sportId/governing-bodies/:governingBodyId/organisations/:organisationId',
    title: 'Sport Management',
    loadComponent: () =>
      import('./organisation-detail/organisation-detail.component').then(
        (m) => m.OrganisationDetailComponent,
      ),
  },
  {
    path: ':sportId/governing-bodies/:governingBodyId/organisations/:organisationId/participants/:participantId',
    title: 'Sport Management',
    loadComponent: () =>
      import('./participant-detail/participant-detail.component').then(
        (m) => m.ParticipantDetailComponent,
      ),
  },
];
