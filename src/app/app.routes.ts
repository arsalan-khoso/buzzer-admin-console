import { Routes } from '@angular/router';
import { NAV_GROUPS } from './common/constants/navigation.constants';

const sectionRoutes: Routes = NAV_GROUPS.flatMap((group) => group.items).map((item) => ({
  path: item.route.slice(1),
  title: item.label,
  loadComponent: () =>
    import('./common/components/placeholder-page/placeholder-page.component').then(
      (m) => m.PlaceholderPage,
    ),
}));

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./common/components/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [{ path: '', redirectTo: 'sports', pathMatch: 'full' }, ...sectionRoutes],
  },
  { path: '**', redirectTo: '' },
];
