import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { SportImportService, ImportProgress } from '../../services/sport-import.service';

@Component({
  selector: 'app-bulk-import-dialog',
  templateUrl: './bulk-import-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class BulkImportDialogComponent {
  private readonly importService = inject(SportImportService);

  /** Emits when the dialog closes; true when at least one sport was added. */
  readonly closed = output<boolean>();

  readonly progress = signal<ImportProgress | null>(null);
  readonly isImporting = signal(false);
  readonly errorMessage = signal('');
  readonly fileName = signal('');

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || this.isImporting()) {
      return;
    }
    this.errorMessage.set('');
    this.progress.set(null);
    this.fileName.set(file.name);

    let rows;
    try {
      rows = this.importService.parse(file.name, await file.text());
    } catch {
      this.errorMessage.set('The file could not be read. Use a CSV or a JSON array of sports.');
      return;
    }
    if (!rows.length) {
      this.errorMessage.set('No rows with a name were found in the file.');
      return;
    }

    this.isImporting.set(true);
    this.importService
      .import(rows)
      .pipe(finalize(() => this.isImporting.set(false)))
      .subscribe((progress) => this.progress.set(progress));
  }

  close(): void {
    if (!this.isImporting()) {
      this.closed.emit((this.progress()?.added ?? 0) > 0);
    }
  }
}
