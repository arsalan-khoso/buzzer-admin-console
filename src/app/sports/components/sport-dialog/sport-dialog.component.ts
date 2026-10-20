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
import { Sport } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * Add/Edit Sport dialog laid out as the Figma "Add Sport" screen: a name (emoji allowed) and a
 * hex colour whose swatch updates as you type. The API has no colour field, so only the name is
 * saved; the table keeps picking the row accent from the design system palette.
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
  });
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  private readonly colourValue = toSignal(this.form.controls.colour.valueChanges, {
    initialValue: '',
  });
  /** The swatch beside the field shows the typed colour once it is a full hex value. */
  readonly swatch = computed(() => {
    const colour = this.colourValue();
    return HEX_COLOUR.test(colour) ? colour : null;
  });

  ngOnInit(): void {
    const sport = this.sport();
    if (sport) {
      this.form.controls.name.setValue(sport.name);
    }
  }

  clear(control: 'name' | 'colour'): void {
    this.form.controls[control].setValue('');
  }

  showError(control: 'name' | 'colour'): boolean {
    const field = this.form.controls[control];
    return field.invalid && field.touched;
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    const name = this.form.controls.name.value.trim();
    const sport = this.sport();
    const request = sport
      ? this.sportsService.update(sport.id, { name })
      : this.sportsService.create({ name });

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
