import { Routes } from '@angular/router';

export const PAYMENTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Payments',
    loadComponent: () =>
      import('./payment-list/payment-list.component').then((m) => m.PaymentListComponent),
  },
];
