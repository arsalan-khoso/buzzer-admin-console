import { Routes } from '@angular/router';

export const SPORTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Sport Management',
    loadComponent: () =>
      import('./sport-list/sport-list.component').then((m) => m.SportListComponent),
  },
];
