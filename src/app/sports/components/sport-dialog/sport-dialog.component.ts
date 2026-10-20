import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { httpErrorMessage } from '../../../common/utils/http-error.util';
import { SPORT_ACCENTS } from '../../constants/sports.constants';
import { Sport, toSportInput } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

const URL_PATTERN = /^https?:\/\/\S+$/;

/**
 * Add/Edit Sport dialog laid out as the Figma "Add Sport" screen: name, and an icon row whose
 * square shows the icon on a palette colour (the API stores no colour, so it is not saved).
 */
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
  });
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly iconFailed = signal(false);
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  /** The icon square fills with a palette colour once a working icon URL is entered. */
  readonly hasIcon = computed(
    () => !!this.values().iconUrl && this.form.controls.iconUrl.valid && !this.iconFailed(),
  );
  readonly accent = computed(() => {
    const name = this.values().name ?? '';
    const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return SPORT_ACCENTS[hash % SPORT_ACCENTS.length];
  });

  ngOnInit(): void {
    const sport = this.sport();
    if (sport) {
      this.form.setValue({ name: sport.name, iconUrl: sport.iconUrl ?? '' });
    }
  }

  clear(control: 'name' | 'iconUrl'): void {
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
