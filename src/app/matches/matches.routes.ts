import { Routes } from '@angular/router';

export const MATCHES_ROUTES: Routes = [
  {
    path: '',
    title: 'Matches',
    loadComponent: () =>
      import('./match-list/match-list.component').then((m) => m.MatchListComponent),
  },
];
