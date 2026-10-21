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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, map, of } from 'rxjs';
import { httpErrorMessage } from '../../../common/utils/http-error.util';
import { Team } from '../../../sports/models/hierarchy.model';
import { Sport } from '../../../sports/models/sport.model';
import { SportsService } from '../../../sports/services/sports.service';
import { MATCH_DIALOG_OPTIONS_LIMIT } from '../../constants/matches.constants';
import { Match } from '../../models/match.model';
import { MatchesService } from '../../services/matches.service';
import {
  differentTeamsValidator,
  fromDateTimeInput,
  toDateTimeInput,
} from '../../utils/match-form.util';

/**
 * Schedule Match (sport, home and away teams of that sport, date and time, optional venue) and
 * Edit Match (only date, time and venue can change).
 */
@Component({
  selector: 'app-match-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './match-dialog.component.html',
  styleUrl: './match-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class MatchDialogComponent implements OnInit {
  private readonly matches = inject(MatchesService);
  private readonly sportsService = inject(SportsService);

  /** The match to edit; empty when scheduling a new one. */
  readonly match = input<Match | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly form = inject(NonNullableFormBuilder).group(
    {
      sportId: ['', Validators.required],
      homeTeamId: ['', Validators.required],
      awayTeamId: ['', Validators.required],
      scheduledAt: ['', Validators.required],
      venue: [''],
    },
    { validators: differentTeamsValidator },
  );

  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly sports = toSignal(
    this.sportsService
      .list({ limit: MATCH_DIALOG_OPTIONS_LIMIT, sortBy: 'name', sortOrder: 'asc' })
      .pipe(
        map((page) => page.items),
        catchError(() => of<Sport[]>([])),
      ),
    { initialValue: [] },
  );
  readonly teams = signal<Team[]>([]);
  readonly isLoadingTeams = signal(false);
  readonly isEdit = computed(() => this.match() !== null);

  constructor() {
    // Teams depend on the sport: a new sport clears both picks and loads its teams
    this.form.controls.sportId.valueChanges.pipe(takeUntilDestroyed()).subscribe((sportId) => {
      this.form.patchValue({ homeTeamId: '', awayTeamId: '' });
      this.teams.set([]);
      if (!sportId) {
        return;
      }
      this.isLoadingTeams.set(true);
      this.matches
        .teamsForSport(sportId)
        .pipe(
          catchError(() => of<Team[]>([])),
          finalize(() => this.isLoadingTeams.set(false)),
        )
        .subscribe((teams) => this.teams.set(teams));
    });
  }

  ngOnInit(): void {
    const match = this.match();
    if (match) {
      // Sport and teams are fixed once a match exists; the API only updates time and venue
      this.form.controls.sportId.disable({ emitEvent: false });
      this.form.controls.homeTeamId.disable();
      this.form.controls.awayTeamId.disable();
      this.form.patchValue({
        scheduledAt: toDateTimeInput(match.scheduledAt),
        venue: match.venue ?? '',
      });
    }
  }

  showError(key: 'sportId' | 'homeTeamId' | 'awayTeamId' | 'scheduledAt'): boolean {
    const control = this.form.controls[key];
    return control.invalid && (control.touched || this.submitted());
  }

  /** Shown as soon as both teams are picked, before submitting. */
  hasSameTeam(): boolean {
    return this.form.hasError('sameTeam');
  }

  clearVenue(): void {
    this.form.controls.venue.setValue('');
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    const value = this.form.getRawValue();
    const venue = value.venue.trim();
    const scheduledAt = fromDateTimeInput(value.scheduledAt);
    const match = this.match();
    const request = match
      ? this.matches.update(match.id, { scheduledAt, venue })
      : this.matches.create({
          sportId: value.sportId,
          homeTeamId: value.homeTeamId,
          awayTeamId: value.awayTeamId,
          scheduledAt,
          ...(venue ? { venue } : {}),
        });

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => this.saved.emit(),
      error: (error: unknown) => this.errorMessage.set(matchErrorMessage(error)),
    });
  }
}

/** A 400 without field details (e.g. the same team twice) only says "Validation failed". */
function matchErrorMessage(error: unknown): string {
  const message = httpErrorMessage(error);
  return error instanceof HttpErrorResponse &&
    error.status === 400 &&
    message === 'Validation failed'
    ? 'The match was rejected. Home and away must be two different teams of the selected sport.'
    : message;
}
