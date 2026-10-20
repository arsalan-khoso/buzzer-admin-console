import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { httpErrorMessage } from '../../utils/http-error.util';

export interface FormDialogField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'url' | 'date' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
}

export type FormDialogValue = Record<string, string>;

/** Dialog that renders a simple form from a field list and saves it through `save`. */
@Component({
  selector: 'app-form-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class FormDialogComponent implements OnInit {
  readonly title = input.required<string>();
  readonly submitLabel = input('Save');
  readonly fields = input.required<FormDialogField[]>();
  readonly initialValue = input<FormDialogValue>({});
  readonly save = input.required<(value: FormDialogValue) => Observable<unknown>>();
  /** Message shown for a 409 response, e.g. a duplicate name. */
  readonly conflictMessage = input('This item already exists.');

  readonly saved = output<void>();
  readonly closed = output<void>();

  form = new FormGroup<Record<string, FormControl<string>>>({});
  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const controls: Record<string, FormControl<string>> = {};
    for (const field of this.fields()) {
      const validators = [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.type === 'url') {
        validators.push(Validators.pattern(/^https?:\/\/\S+$/));
      }
      controls[field.key] = new FormControl(this.initialValue()[field.key] ?? '', {
        nonNullable: true,
        validators,
      });
    }
    this.form = new FormGroup(controls);
  }

  clear(key: string): void {
    this.form.controls[key].setValue('');
    this.form.controls[key].markAsTouched();
  }

  showError(key: string): boolean {
    const control = this.form.controls[key];
    return control.invalid && (control.touched || this.submitted());
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    const value: FormDialogValue = {};
    for (const [key, raw] of Object.entries(this.form.getRawValue())) {
      value[key] = raw.trim();
    }

    this.isSaving.set(true);
    this.save()(value)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => this.saved.emit(),
        error: (error: unknown) =>
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? this.conflictMessage()
              : httpErrorMessage(error),
          ),
      });
  }
}
