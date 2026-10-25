import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  skip,
  startWith,
  switchMap,
} from 'rxjs';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { LayoutService } from '../../common/services/layout.service';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { TransactionDialogComponent } from '../components/transaction-dialog/transaction-dialog.component';
import {
  PAYMENT_CURRENCIES,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TABS,
  PAYMENT_STATUS_TAGS,
  TRANSACTIONS_PAGE_SIZE,
} from '../constants/payments.constants';
import {
  PaymentStatus,
  PaymentSummary,
  Transaction,
  TransactionSortField,
} from '../models/payment.model';
import { PaymentsService } from '../services/payments.service';
import { paymentMethodLabel, readTransactionView } from '../utils/payments.util';

interface ListState {
  transactions: Transaction[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string;
}

interface SummaryState {
  summary: PaymentSummary | null;
  isLoading: boolean;
  error: string;
}

interface DetailState {
  transaction: Transaction | null;
  error: string;
}

interface PendingChange {
  transaction: Transaction;
  status: PaymentStatus;
}

const LOADING_STATE: ListState = {
  transactions: [],
  total: 0,
  totalPages: 1,
  isLoading: true,
  error: '',
};

@Component({
  selector: 'app-payment-list',
  imports: [DatePipe, TransactionDialogComponent, ConfirmDialogComponent],
  templateUrl: './payment-list.component.html',
  styleUrl: './payment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentListComponent {
  private readonly payments = inject(PaymentsService);
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tabs = PAYMENT_STATUS_TABS;
  readonly currencies = PAYMENT_CURRENCIES;
  readonly statuses = PAYMENT_STATUSES;
  readonly statusLabels = PAYMENT_STATUS_LABELS;
  readonly statusTags = PAYMENT_STATUS_TAGS;
  readonly methodLabel = paymentMethodLabel;

  /** Filters, search, page and sorting all live in the URL, so a reload keeps them. */
  readonly view = toSignal(
    this.route.queryParamMap.pipe(
      map(readTransactionView),
      // Opening a transaction (?tx=) must not reload the list
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    ),
    { initialValue: readTransactionView(this.route.snapshot.queryParamMap) },
  );
  /** The open transaction is in the URL too, so a reload or the back button keeps it. */
  readonly selectedId = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('tx') ?? ''),
      distinctUntilChanged(),
    ),
    { initialValue: this.route.snapshot.queryParamMap.get('tx') ?? '' },
  );
  private readonly listKey = signal(0);
  private readonly summaryKey = signal(0);

  private readonly listState = toSignal(
    toObservable(computed(() => ({ view: this.view(), key: this.listKey() }))).pipe(
      switchMap(({ view }) =>
        this.payments
          .list({
            status: view.status,
            currency: view.currency,
            search: view.search,
            page: view.page,
            limit: TRANSACTIONS_PAGE_SIZE,
            sortBy: view.sortBy,
            sortOrder: view.sortOrder,
          })
          .pipe(
            map((result): ListState => ({
              transactions: result.items,
              total: result.meta.total,
              totalPages: Math.max(result.meta.totalPages, 1),
              isLoading: false,
              error: '',
            })),
            catchError((error: unknown) =>
              of<ListState>({ ...LOADING_STATE, isLoading: false, error: httpErrorMessage(error) }),
            ),
            startWith<ListState>(LOADING_STATE),
          ),
      ),
    ),
    { initialValue: LOADING_STATE },
  );

  /** The last summary loaded, kept on the cards while they load again. */
  private lastSummary: PaymentSummary | null = null;
  private readonly summaryState = toSignal(
    toObservable(this.summaryKey).pipe(
      switchMap(() =>
        this.payments.summary().pipe(
          map((summary): SummaryState => {
            this.lastSummary = summary;
            return { summary, isLoading: false, error: '' };
          }),
          catchError((error: unknown) =>
            of<SummaryState>({ summary: null, isLoading: false, error: httpErrorMessage(error) }),
          ),
          // The cards keep their last values while they load again
          startWith<SummaryState>({ summary: this.lastSummary, isLoading: true, error: '' }),
        ),
      ),
    ),
  );

  /** The row clicked, shown at once while the detail endpoint loads it fresh. */
  private lastOpened: Transaction | null = null;
  private readonly detailState = toSignal(
    toObservable(this.selectedId).pipe(
      switchMap((id) => {
        if (!id) {
          return of<DetailState>({ transaction: null, error: '' });
        }
        const known = this.lastOpened?.id === id ? this.lastOpened : null;
        return this.payments.get(id).pipe(
          map((transaction): DetailState => ({ transaction, error: '' })),
          catchError((error: unknown) =>
            of<DetailState>({ transaction: known, error: httpErrorMessage(error) }),
          ),
          startWith<DetailState>({ transaction: known, error: '' }),
        );
      }),
    ),
  );

  /** Rows changed here, shown until the list loads again. */
  private readonly changed = signal<ReadonlyMap<string, Transaction>>(new Map());
  readonly transactions = computed(() =>
    this.listState().transactions.map((tx) => this.changed().get(tx.id) ?? tx),
  );
  readonly total = computed(() => this.listState().total);
  readonly totalPages = computed(() => this.listState().totalPages);
  readonly isLoading = computed(() => this.listState().isLoading);
  readonly errorMessage = computed(() => this.listState().error);

  readonly summary = computed(() => this.summaryState()?.summary ?? null);
  readonly isSummaryLoading = computed(() => this.summaryState()?.isLoading ?? true);
  readonly summaryError = computed(() => this.summaryState()?.error ?? '');
  readonly statusTotals = computed(() => {
    const byStatus = this.summary()?.byStatus ?? [];
    return PAYMENT_STATUSES.map(
      (status) =>
        byStatus.find((row) => row.status === status) ?? {
          status,
          count: 0,
          totalMinor: 0,
          total: '—',
        },
    );
  });

  readonly canChangeStatus = computed(() => this.auth.capabilities().changePaymentStatus);

  /** The status change made in the dialog, shown until another transaction is opened. */
  private readonly selectedOverride = signal<Transaction | null>(null);
  readonly selected = computed(() => {
    const override = this.selectedOverride();
    if (override && override.id === this.selectedId()) {
      return override;
    }
    return this.detailState()?.transaction ?? null;
  });
  readonly detailError = computed(() => this.detailState()?.error ?? '');
  readonly pendingChange = signal<PendingChange | null>(null);
  readonly isChanging = signal(false);
  readonly changeError = signal('');

  constructor() {
    // The header search drives ?search=; it starts from the URL and is cleared on leaving
    this.layout.setSearchPlaceholder('Search transactions');
    this.layout.setSearchQuery(this.view().search);
    inject(DestroyRef).onDestroy(() => {
      this.layout.setSearchPlaceholder(null);
      this.layout.setSearchQuery('');
    });
    toObservable(this.layout.searchQuery)
      .pipe(skip(1), debounceTime(300), takeUntilDestroyed())
      .subscribe((query) => {
        if (query.trim() !== this.view().search) {
          this.setQuery({ search: query.trim() || null, page: null });
        }
      });
    // Back and forward change the URL; the header follows
    effect(() => {
      const search = this.view().search;
      untracked(() => {
        if (this.layout.searchQuery().trim() !== search) {
          this.layout.setSearchQuery(search);
        }
      });
    });

    // A narrower filter, or an old link, can point past the last page
    effect(() => {
      const { isLoading, error, totalPages } = this.listState();
      const page = this.view().page;
      if (!isLoading && !error && page > totalPages) {
        untracked(() => this.goToPage(totalPages));
      }
    });

    // A fresh list replaces the rows changed here
    toObservable(this.listState)
      .pipe(takeUntilDestroyed())
      .subscribe((state) => {
        if (!state.isLoading) {
          this.changed.set(new Map());
        }
      });
  }

  selectTab(status: PaymentStatus | ''): void {
    this.setQuery({ status: status || null, page: null });
  }

  selectCurrency(event: Event): void {
    const currency = (event.target as HTMLSelectElement).value;
    this.setQuery({ currency: currency || null, page: null });
  }

  /** Same column flips the order; a new column starts with the largest / newest first. */
  sortBy(field: TransactionSortField): void {
    const { sortBy, sortOrder } = this.view();
    const order = field === sortBy && sortOrder === 'desc' ? 'asc' : 'desc';
    this.setQuery({
      sortBy: field === 'createdAt' ? null : field,
      sortOrder: order === 'desc' ? null : order,
      page: null,
    });
  }

  sortState(field: TransactionSortField): 'ascending' | 'descending' | 'none' {
    const { sortBy, sortOrder } = this.view();
    if (sortBy !== field) {
      return 'none';
    }
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  }

  goToPage(page: number): void {
    const target = Math.min(Math.max(page, 1), this.totalPages());
    this.setQuery({ page: target > 1 ? target : null });
  }

  clearFilters(): void {
    this.layout.setSearchQuery('');
    this.setQuery({ status: null, currency: null, search: null, page: null });
  }

  hasFilters(): boolean {
    const { status, currency, search } = this.view();
    return !!(status || currency || search);
  }

  open(transaction: Transaction): void {
    this.lastOpened = transaction;
    this.setQuery({ tx: transaction.id });
  }

  closeDetail(): void {
    this.pendingChange.set(null);
    this.setQuery({ tx: null });
  }

  retryList(): void {
    this.listKey.update((key) => key + 1);
  }

  retrySummary(): void {
    this.summaryKey.update((key) => key + 1);
  }

  askStatusChange(status: PaymentStatus): void {
    const transaction = this.selected();
    if (transaction) {
      this.changeError.set('');
      this.pendingChange.set({ transaction, status });
    }
  }

  confirmStatusChange(): void {
    const pending = this.pendingChange();
    if (!pending || this.isChanging()) {
      return;
    }
    this.isChanging.set(true);
    this.payments.changeStatus(pending.transaction.id, pending.status).subscribe({
      next: (updated) => {
        this.isChanging.set(false);
        this.pendingChange.set(null);
        this.changed.update((rows) => new Map(rows).set(updated.id, updated));
        this.selectedOverride.set(updated);
        // The cards are totals per status, so they are loaded again
        this.summaryKey.update((key) => key + 1);
      },
      error: (error: unknown) => {
        this.isChanging.set(false);
        this.changeError.set(httpErrorMessage(error));
      },
    });
  }

  changeMessage(pending: PendingChange): string {
    const { transaction, status } = pending;
    return (
      `Change ${transaction.reference} (${transaction.amountFormatted}) from ` +
      `${this.statusLabels[transaction.status]} to ${this.statusLabels[status]}?`
    );
  }

  private setQuery(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
