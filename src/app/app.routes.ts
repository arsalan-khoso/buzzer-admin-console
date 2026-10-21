import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/guards/auth.guard';
import { NAV_GROUPS } from './common/constants/navigation.constants';

/** Sections with their own pages; every other sidebar link shows the placeholder. */
const BUILT_SECTIONS = ['/sports', '/matches'];

const sectionRoutes: Routes = NAV_GROUPS.flatMap((group) => group.items)
  .filter((item) => !BUILT_SECTIONS.includes(item.route))
  .map((item) => ({
    path: item.route.slice(1),
    title: item.pageTitle ?? item.label,
    loadComponent: () =>
      import('./common/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPage,
      ),
  }));

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./common/components/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'sports',
        loadChildren: () => import('./sports/sports.routes').then((m) => m.SPORTS_ROUTES),
      },
      {
        path: 'matches',
        loadChildren: () => import('./matches/matches.routes').then((m) => m.MATCHES_ROUTES),
      },
      ...sectionRoutes,
    ],
  },
  { path: '**', redirectTo: '' },
];
