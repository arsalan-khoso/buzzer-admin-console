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
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { httpErrorMessage } from '../../../common/utils/http-error.util';
import { Sport, SportInput } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
const URL_PATTERN = /^https?:\/\/\S+$/;

/**
 * Add/Edit Sport dialog laid out as the Figma "Add Sport" screen: name (emoji allowed) and an
 * icon-and-colour row. The + square opens the icon URL field; the hex field tints the square.
 * The API stores no colour, so the colour only previews; name and icon URL are saved.
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
    colour: ['', Validators.pattern(HEX_COLOUR)],
    iconUrl: ['', Validators.pattern(URL_PATTERN)],
  });
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly isIconFieldOpen = signal(false);
  readonly iconFailed = signal(false);

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  /** The square fills with the typed colour once it is a full hex value. */
  readonly swatch = computed(() => {
    const colour = this.values().colour ?? '';
    return HEX_COLOUR.test(colour) ? colour : null;
  });
  readonly showsIcon = computed(
    () => !!this.values().iconUrl && this.form.controls.iconUrl.valid && !this.iconFailed(),
  );

  ngOnInit(): void {
    const sport = this.sport();
    if (sport) {
      this.form.patchValue({ name: sport.name, iconUrl: sport.iconUrl ?? '' });
      this.isIconFieldOpen.set(!!sport.iconUrl);
    }
  }

  toggleIconField(): void {
    this.isIconFieldOpen.update((open) => !open);
  }

  clear(control: 'name' | 'colour' | 'iconUrl'): void {
    this.form.controls[control].setValue('');
  }

  showError(control: 'name' | 'colour' | 'iconUrl'): boolean {
    const field = this.form.controls[control];
    return field.invalid && field.touched;
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    const { name, iconUrl } = this.form.getRawValue();
    const input: SportInput = { name: name.trim() };
    if (iconUrl.trim()) {
      input.iconUrl = iconUrl.trim();
    }
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
