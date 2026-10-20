import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/guards/auth.guard';
import { NAV_GROUPS } from './common/constants/navigation.constants';

const sectionRoutes: Routes = NAV_GROUPS.flatMap((group) => group.items)
  .filter((item) => item.route !== '/sports' && item.route !== '/dashboard')
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
      // The console opens on the Sport Management dashboard (stat cards and sports table)
      {
        path: 'dashboard',
        title: 'Sport Management',
        loadComponent: () =>
          import('./sports/sport-list/sport-list.component').then((m) => m.SportListComponent),
      },
      {
        path: 'sports',
        loadChildren: () => import('./sports/sports.routes').then((m) => m.SPORTS_ROUTES),
      },
      ...sectionRoutes,
    ],
  },
  { path: '**', redirectTo: '' },
];
