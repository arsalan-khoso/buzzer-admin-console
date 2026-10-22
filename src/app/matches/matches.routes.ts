import { Routes } from '@angular/router';

export const MATCHES_ROUTES: Routes = [
  {
    path: '',
    title: 'Matches',
    loadComponent: () =>
      import('./match-list/match-list.component').then((m) => m.MatchListComponent),
  },
  {
    path: ':matchId',
    title: 'Matches',
    loadComponent: () =>
      import('./match-detail/match-detail.component').then((m) => m.MatchDetailComponent),
  },
];
