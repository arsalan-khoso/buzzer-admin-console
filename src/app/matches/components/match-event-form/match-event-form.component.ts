import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { httpErrorMessage } from '../../../common/utils/http-error.util';
import { Participant } from '../../../sports/models/hierarchy.model';
import { MATCH_EVENT_LABELS, MATCH_EVENT_TYPES } from '../../constants/matches.constants';
import { Match, MatchEvent, MatchEventType } from '../../models/match.model';
import { MatchesService } from '../../services/matches.service';
import { goalNeedsTeamValidator } from '../../utils/match-detail.util';

/** Add Event panel of a LIVE match: type, minute, team, player of that team, optional note. */
@Component({
  selector: 'app-match-event-form',
  imports: [ReactiveFormsModule],
  templateUrl: './match-event-form.component.html',
  styleUrl: './match-event-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchEventFormComponent {
  private readonly matches = inject(MatchesService);

  readonly match = input.required<Match>();
  /** Players of both teams; the list is narrowed to the chosen team. */
  readonly players = input<Participant[]>([]);
  readonly added = output<MatchEvent>();

  readonly types = MATCH_EVENT_TYPES;
  readonly labels = MATCH_EVENT_LABELS;

  readonly form = inject(NonNullableFormBuilder).group(
    {
      type: ['', Validators.required],
      minute: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      teamId: [''],
      playerId: [''],
      detail: [''],
    },
    { validators: goalNeedsTeamValidator },
  );

  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  private readonly teamId = toSignal(this.form.controls.teamId.valueChanges, {
    initialValue: '',
  });
  readonly teamPlayers = computed(() =>
    this.players().filter((player) => player.teamId === this.teamId()),
  );

  constructor() {
    // A player belongs to one team, so changing the team clears the player
    this.form.controls.teamId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.playerId.setValue(''));
  }

  showError(key: 'type' | 'minute'): boolean {
    const control = this.form.controls[key];
    return control.invalid && (control.touched || this.submitted());
  }

  showTeamError(): boolean {
    return (
      this.form.hasError('goalNeedsTeam') && (this.form.controls.teamId.touched || this.submitted())
    );
  }

  playerPlaceholder(): string {
    if (!this.form.controls.teamId.value) {
      return 'Pick a team first';
    }
    return this.teamPlayers().length ? 'No player' : 'No players in this team';
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    const { type, minute, teamId, playerId, detail } = this.form.getRawValue();
    const note = detail.trim();
    this.isSaving.set(true);
    this.matches
      .addEvent(this.match().id, {
        type: type as MatchEventType,
        minute: Number(minute),
        ...(teamId ? { teamId } : {}),
        ...(playerId ? { playerId } : {}),
        ...(note ? { detail: note } : {}),
      })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (event) => {
          this.added.emit(event);
          // Keep the minute for the next event; clear the rest
          this.form.reset({ type: '', minute, teamId: '', playerId: '', detail: '' });
          this.submitted.set(false);
        },
        error: (error: unknown) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }
}
