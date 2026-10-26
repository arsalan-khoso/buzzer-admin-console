import { PaymentStatus, PaymentStatusTab, TransactionSortField } from '../models/payment.model';

export const PAYMENTS_ENDPOINTS = {
  summary: 'payments/summary',
  transactions: 'payments/transactions',
} as const;

export const TRANSACTIONS_PAGE_SIZE = 20;

export const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

export const PAYMENT_STATUS_TABS: PaymentStatusTab[] = [
  { label: 'All', status: '' },
  { label: 'Pending', status: 'PENDING' },
  { label: 'Completed', status: 'COMPLETED' },
  { label: 'Failed', status: 'FAILED' },
  { label: 'Refunded', status: 'REFUNDED' },
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

/** Tag modifier per status, from the design system accents. */
export const PAYMENT_STATUS_TAGS: Record<PaymentStatus, string> = {
  PENDING: 'tag--accent',
  COMPLETED: 'tag--success',
  FAILED: 'tag--danger',
  REFUNDED: '',
};

/** The currencies the backend holds; the filter value must be upper case. */
export const PAYMENT_CURRENCIES = ['USD', 'EUR', 'GBP'];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  paypal: 'PayPal',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

/** Unknown sort fields make the backend fail with 500, so only these are sent. */
export const TRANSACTION_SORT_FIELDS: TransactionSortField[] = ['createdAt', 'amount'];
