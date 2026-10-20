import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { httpErrorMessage } from '../../../common/utils/http-error.util';
import { Sport, SportInput } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

const URL_PATTERN = /^https?:\/\/\S+$/;

@Component({
  selector: 'app-sport-form-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './sport-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class SportFormDialogComponent implements OnInit {
  private readonly sportsService = inject(SportsService);

  /** The sport to edit; empty when adding a new one. */
  readonly sport = input<Sport | null>(null);
  readonly saved = output<Sport>();
  readonly closed = output<void>();

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    iconUrl: ['', Validators.pattern(URL_PATTERN)],
  });
  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const sport = this.sport();
    if (sport) {
      this.form.setValue({
        name: sport.name,
        description: sport.description ?? '',
        iconUrl: sport.iconUrl ?? '',
      });
    }
  }

  showError(control: 'name' | 'iconUrl'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || this.submitted());
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid || this.isSaving()) {
      return;
    }

    const { name, description, iconUrl } = this.form.getRawValue();
    const payload: SportInput = { name: name.trim(), description: description.trim() };
    if (iconUrl.trim()) {
      payload.iconUrl = iconUrl.trim();
    }
    const sport = this.sport();
    const request = sport
      ? this.sportsService.update(sport.id, payload)
      : this.sportsService.create(payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: (saved) => this.saved.emit(saved),
      error: (error: unknown) =>
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 409
            ? 'A sport with this name already exists.'
            : httpErrorMessage(error),
        ),
    });
  }
}
