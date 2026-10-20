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
import { Sport, toSportInput } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

const URL_PATTERN = /^https?:\/\/\S+$/;

/** Add/Edit Sport dialog laid out as the Figma "Add Sport" screen (fields from the task doc). */
@Component({
  selector: 'app-sport-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './sport-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class SportDialogComponent implements OnInit {
  private readonly sportsService = inject(SportsService);

  readonly sport = input<Sport | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    iconUrl: ['', Validators.pattern(URL_PATTERN)],
    description: [''],
  });
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly iconFailed = signal(false);

  ngOnInit(): void {
    const sport = this.sport();
    if (sport) {
      this.form.setValue({
        name: sport.name,
        iconUrl: sport.iconUrl ?? '',
        description: sport.description ?? '',
      });
    }
  }

  clear(control: 'name' | 'iconUrl' | 'description'): void {
    this.form.controls[control].setValue('');
  }

  showError(control: 'name' | 'iconUrl'): boolean {
    const field = this.form.controls[control];
    return field.invalid && field.touched;
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    const input = toSportInput(this.form.getRawValue());
    const sport = this.sport();
    const request = sport
      ? this.sportsService.update(sport.id, input)
      : this.sportsService.create(input);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => this.saved.emit(),
      error: (error: unknown) =>
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 409
            ? 'A sport with this name already exists.'
            : httpErrorMessage(error),
        ),
    });
  }
}
