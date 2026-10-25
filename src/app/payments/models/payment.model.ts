export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Transaction {
  id: string;
  reference: string;
  /** Minor units (cents); `amountFormatted` is what the page shows. */
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  description: string | null;
  customer: string | null;
  createdAt: string;
  updatedAt: string;
  amountFormatted: string;
}

export interface PaymentStatusTotal {
  status: PaymentStatus;
  count: number;
  totalMinor: number;
  /** Formatted by the backend, e.g. "$364.10". */
  total: string;
}

export interface PaymentSummary {
  byStatus: PaymentStatusTotal[];
  grossRevenue: string;
  grossRevenueMinor: number;
}

/** Sortable columns of the transactions table. */
export type TransactionSortField = 'createdAt' | 'amount';

/** One status tab: `status` is empty for "All". */
export interface PaymentStatusTab {
  label: string;
  status: PaymentStatus | '';
}
