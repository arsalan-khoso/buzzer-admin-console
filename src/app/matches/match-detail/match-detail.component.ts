import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, combineLatest, forkJoin, map, of, switchMap } from 'rxjs';
import { BreadcrumbComponent } from '../../common/components/breadcrumb/breadcrumb.component';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import {
  MATCH_EVENT_LABELS,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_TAGS,
} from '../constants/matches.constants';
import {
  Match,
  MatchEvent,
  MatchScoreboard,
  MatchStats,
  MatchStatusAction,
} from '../models/match.model';
import { MatchesService } from '../services/matches.service';
import { statsRows, statusActions } from '../utils/match-detail.util';

interface MatchDetailState {
  match: Match | null;
  scoreboard: MatchScoreboard | null;
  timeline: MatchEvent[];
  stats: MatchStats | null;
  error: string;
}

/** List query params carried over from the Matches page, so going back keeps tab and page. */
const LIST_QUERY_KEYS = ['status', 'page'];

@Component({
  selector: 'app-match-detail',
  imports: [DatePipe, BreadcrumbComponent, ConfirmDialogComponent],
  templateUrl: './match-detail.component.html',
  styleUrl: './match-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchDetailComponent {
  private readonly matchesService = inject(MatchesService);
  private readonly route = inject(ActivatedRoute);
  private readonly matchId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('matchId') ?? '')),
    { initialValue: '' },
  );
  private readonly reloadKey = signal(0);

  readonly statusLabels = MATCH_STATUS_LABELS;
  readonly statusTags = MATCH_STATUS_TAGS;
  readonly eventLabels = MATCH_EVENT_LABELS;

  private readonly state = toSignal(
    combineLatest([toObservable(this.matchId), toObservable(this.reloadKey)]).pipe(
      switchMap(([id]) =>
        forkJoin({
          match: this.matchesService.get(id),
          scoreboard: this.matchesService.scoreboard(id),
          timeline: this.matchesService.timeline(id),
          stats: this.matchesService.stats(id),
        }).pipe(
          map((data): MatchDetailState => ({ ...data, error: '' })),
          catchError((error: unknown) =>
            of<MatchDetailState>({
              match: null,
              scoreboard: null,
              timeline: [],
              stats: null,
              error: httpErrorMessage(error),
            }),
          ),
        ),
      ),
    ),
  );

  readonly match = computed(() => this.state()?.match ?? null);
  readonly scoreboard = computed(() => this.state()?.scoreboard ?? null);
  readonly timeline = computed(() => this.state()?.timeline ?? []);
  readonly stats = computed(() => this.state()?.stats ?? null);
  readonly statsRows = computed(() => {
    const stats = this.stats();
    return stats ? statsRows(stats) : [];
  });
  readonly errorMessage = computed(() => this.state()?.error ?? '');
  readonly isLoading = computed(() => this.state() === undefined);
  readonly actions = computed(() => {
    const match = this.match();
    return match ? statusActions(match.status) : [];
  });

  private readonly listQuery = toSignal(
    this.route.queryParamMap.pipe(
      map((params) =>
        Object.fromEntries(
          LIST_QUERY_KEYS.filter((key) => params.has(key)).map((key) => [key, params.get(key)]),
        ),
      ),
    ),
    { initialValue: {} },
  );
  readonly breadcrumb = computed(() => {
    const match = this.match();
    return [
      { label: 'Matches', link: ['/matches'], queryParams: this.listQuery() },
      { label: match ? this.matchName(match) : '…' },
    ];
  });

  readonly pendingAction = signal<MatchStatusAction | null>(null);
  readonly isChanging = signal(false);
  readonly statusError = signal('');

  runAction(action: MatchStatusAction): void {
    this.statusError.set('');
    if (action.confirm) {
      this.pendingAction.set(action);
    } else {
      this.changeStatus(action);
    }
  }

  confirmAction(): void {
    const action = this.pendingAction();
    if (action) {
      this.changeStatus(action);
    }
  }

  cancelAction(): void {
    this.pendingAction.set(null);
    this.statusError.set('');
  }

  matchName(match: Match): string {
    return `${match.homeTeam?.name ?? 'Home'} vs ${match.awayTeam?.name ?? 'Away'}`;
  }

  playerName(event: MatchEvent): string {
    const player = event.player;
    if (!player) {
      return '—';
    }
    const name = `${player.firstName} ${player.lastName}`.trim();
    return player.jerseyNumber !== null ? `#${player.jerseyNumber} ${name}` : name;
  }

  confirmMessage(action: MatchStatusAction, match: Match): string {
    return action.status === 'FINISHED'
      ? `Finish ${this.matchName(match)}? The final score is kept and the match cannot be restarted.`
      : `Cancel ${this.matchName(match)}? A cancelled match cannot be started again.`;
  }

  private changeStatus(action: MatchStatusAction): void {
    const match = this.match();
    if (!match) {
      return;
    }
    this.isChanging.set(true);
    this.matchesService.changeStatus(match.id, action.status).subscribe({
      next: () => {
        this.isChanging.set(false);
        this.pendingAction.set(null);
        this.reload();
      },
      error: (error: unknown) => {
        this.isChanging.set(false);
        this.statusError.set(httpErrorMessage(error));
      },
    });
  }

  private reload(): void {
    this.reloadKey.update((key) => key + 1);
  }
}
