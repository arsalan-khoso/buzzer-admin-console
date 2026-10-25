import { ParamMap } from '@angular/router';
import { SortOrder } from '../../core/models/api.model';
import {
  PAYMENT_CURRENCIES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  TRANSACTION_SORT_FIELDS,
} from '../constants/payments.constants';
import { PaymentStatus, TransactionSortField } from '../models/payment.model';

/** The table's state, all of it kept in the URL so a reload shows the same view. */
export interface TransactionView {
  status: PaymentStatus | '';
  currency: string;
  search: string;
  page: number;
  sortBy: TransactionSortField;
  sortOrder: SortOrder;
}

export const DEFAULT_TRANSACTION_VIEW: TransactionView = {
  status: '',
  currency: '',
  search: '',
  page: 1,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

/**
 * Reads the view from the URL. Unknown values fall back to the defaults, because the backend
 * answers an unknown status or sort field with a 500.
 */
export function readTransactionView(params: ParamMap): TransactionView {
  const status = params.get('status') ?? '';
  const currency = (params.get('currency') ?? '').toUpperCase();
  const sortBy = params.get('sortBy') ?? '';
  const sortOrder = params.get('sortOrder');
  return {
    status: PAYMENT_STATUSES.includes(status as PaymentStatus) ? (status as PaymentStatus) : '',
    currency: PAYMENT_CURRENCIES.includes(currency) ? currency : '',
    search: (params.get('search') ?? '').trim(),
    page: Math.max(Math.floor(Number(params.get('page'))) || 1, 1),
    sortBy: TRANSACTION_SORT_FIELDS.includes(sortBy as TransactionSortField)
      ? (sortBy as TransactionSortField)
      : DEFAULT_TRANSACTION_VIEW.sortBy,
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

/** "apple_pay" -> "Apple Pay"; unknown methods are title-cased, a missing one is a dash. */
export function paymentMethodLabel(method: string | null): string {
  if (!method) {
    return '—';
  }
  return (
    PAYMENT_METHOD_LABELS[method] ??
    method
      .split(/[_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}
