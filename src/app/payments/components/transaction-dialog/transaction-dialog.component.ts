import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TAGS,
} from '../../constants/payments.constants';
import { PaymentStatus, Transaction } from '../../models/payment.model';
import { paymentMethodLabel } from '../../utils/payments.util';

/** Transaction detail, with the status change for roles that may make it. */
@Component({
  selector: 'app-transaction-dialog',
  imports: [DatePipe],
  templateUrl: './transaction-dialog.component.html',
  styleUrl: './transaction-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class TransactionDialogComponent {
  readonly transaction = input.required<Transaction>();
  readonly canChangeStatus = input(false);
  /** True while a confirmation is open on top, so Escape closes that one first. */
  readonly isConfirming = input(false);
  readonly errorMessage = input('');

  readonly statusRequested = output<PaymentStatus>();
  readonly closed = output<void>();

  readonly statusLabels = PAYMENT_STATUS_LABELS;
  readonly statusTags = PAYMENT_STATUS_TAGS;
  readonly methodLabel = paymentMethodLabel;

  readonly nextStatus = signal<PaymentStatus | ''>('');
  /** Every status except the current one. */
  readonly statusOptions = computed(() =>
    PAYMENT_STATUSES.filter((status) => status !== this.transaction().status),
  );

  /** Changes only when another transaction is shown or its status changed, not on a refetch. */
  private readonly identity = computed(
    () => `${this.transaction().id}:${this.transaction().status}`,
  );

  constructor() {
    // Another transaction, or a new status, starts the picker over
    effect(() => {
      this.identity();
      untracked(() => this.nextStatus.set(''));
    });
  }

  onStatusPicked(event: Event): void {
    this.nextStatus.set((event.target as HTMLSelectElement).value as PaymentStatus | '');
  }

  requestChange(): void {
    const status = this.nextStatus();
    if (status) {
      this.statusRequested.emit(status);
    }
  }

  onEscape(): void {
    if (!this.isConfirming()) {
      this.closed.emit();
    }
  }
}
