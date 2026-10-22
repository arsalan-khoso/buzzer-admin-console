import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancelled.emit()' },
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Delete');
  readonly cancelLabel = input('Cancel');
  readonly isBusy = input(false);
  readonly errorMessage = input('');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
