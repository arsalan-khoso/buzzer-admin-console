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
import { Organisation } from '../../models/hierarchy.model';
import { HierarchyService } from '../../services/hierarchy.service';

/**
 * Add/Edit Competition (organisation) dialog laid out as the Figma "Add Competition" screen.
 * The API stores only the name here, so image upload and profile linking are shown disabled.
 */
@Component({
  selector: 'app-competition-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './competition-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class CompetitionDialogComponent implements OnInit {
  private readonly hierarchy = inject(HierarchyService);

  /** The competition to edit; empty when adding one to `governingBodyId`. */
  readonly organisation = input<Organisation | null>(null);
  readonly governingBodyId = input('');
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
  });
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const organisation = this.organisation();
    if (organisation) {
      this.form.setValue({ name: organisation.name });
    }
  }

  clearName(): void {
    this.form.controls.name.setValue('');
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    const name = this.form.controls.name.value.trim();
    const organisation = this.organisation();
    const request = organisation
      ? this.hierarchy.updateOrganisation(organisation.id, { name })
      : this.hierarchy.createOrganisation({ name, governingBodyId: this.governingBodyId() });

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => this.saved.emit(),
      error: (error: unknown) => this.errorMessage.set(httpErrorMessage(error)),
    });
  }
}
