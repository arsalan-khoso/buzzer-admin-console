import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import {
  Observable,
  catchError,
  combineLatest,
  filter,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { BreadcrumbComponent } from '../../common/components/breadcrumb/breadcrumb.component';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import { Participant } from '../../sports/models/hierarchy.model';
import { MatchEventFormComponent } from '../components/match-event-form/match-event-form.component';
import {
  MATCH_EVENT_LABELS,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_TAGS,
} from '../constants/matches.constants';
import {
  Match,
  MatchEvent,
  MatchLiveMessage,
  MatchScoreboard,
  MatchStats,
  MatchStatus,
  MatchStatusAction,
} from '../models/match.model';
import { MatchLiveService } from '../services/match-live.service';
import { MatchesService } from '../services/matches.service';
import {
  hasScore,
  mergeTimeline,
  nameEvent,
  statsRows,
  statusActions,
  withLiveStats,
} from '../utils/match-detail.util';

interface MatchDetailState {
  match: Match | null;
  scoreboard: MatchScoreboard | null;
  timeline: MatchEvent[];
  stats: MatchStats | null;
  /** Players of both teams, for the event form and for naming live events. */
  players: Participant[];
  error: string;
}

/** List query params carried over from the Matches page, so going back keeps tab and page. */
const LIST_QUERY_KEYS = ['status', 'page'];

@Component({
  selector: 'app-match-detail',
  imports: [DatePipe, BreadcrumbComponent, ConfirmDialogComponent, MatchEventFormComponent],
  templateUrl: './match-detail.component.html',
  styleUrl: './match-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchDetailComponent {
  /** What the signed-in account may do; action buttons check it. */
  readonly access = inject(AuthService).capabilities;
  private readonly matchesService = inject(MatchesService);
  private readonly live = inject(MatchLiveService);
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
        this.matchesService.get(id).pipe(
          switchMap((match) =>
            forkJoin({
              match: of(match),
              scoreboard: this.matchesService.scoreboard(id),
              timeline: this.matchesService.timeline(id),
              stats: this.matchesService.stats(id),
              players: this.loadPlayers(match),
            }),
          ),
          map((data): MatchDetailState => ({ ...data, error: '' })),
          // Fresh data replaces what the socket pushed while it was loading
          tap(() => {
            this.liveStatus.set(null);
            this.liveScoreboard.set(null);
          }),
          catchError((error: unknown) =>
            of<MatchDetailState>({
              match: null,
              scoreboard: null,
              timeline: [],
              stats: null,
              players: [],
              error: httpErrorMessage(error),
            }),
          ),
        ),
      ),
    ),
  );

  /** Pushed over the socket; they win over the loaded data until the next load. */
  private readonly liveStatus = signal<MatchStatus | null>(null);
  private readonly liveScoreboard = signal<MatchScoreboard | null>(null);
  private readonly liveEvents = signal<MatchEvent[]>([]);
  /**
   * Live events the loaded timeline does not have yet, named from the loaded teams and players.
   * They are kept even when they arrive before the page has loaded, so none is lost.
   */
  private readonly newEvents = computed(() => {
    const match = this.state()?.match;
    if (!match) {
      return [];
    }
    const loaded = new Set((this.state()?.timeline ?? []).map((event) => event.id));
    return this.liveEvents()
      .filter((event) => !loaded.has(event.id))
      .map((event) => nameEvent(event, match, this.players()));
  });

  readonly match = computed(() => {
    const match = this.state()?.match ?? null;
    const status = this.liveStatus();
    return match && status ? { ...match, status } : match;
  });
  readonly isLive = computed(() => this.match()?.status === 'LIVE');
  readonly players = computed(() => this.state()?.players ?? []);
  readonly scoreboard = computed(() => this.liveScoreboard() ?? this.state()?.scoreboard ?? null);
  readonly timeline = computed(() => mergeTimeline(this.state()?.timeline ?? [], this.newEvents()));
  readonly stats = computed(() => {
    const stats = this.state()?.stats ?? null;
    const match = this.match();
    return stats && match ? withLiveStats(stats, this.newEvents(), match) : stats;
  });
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

  constructor() {
    // One socket per open match: switching matches or leaving the page leaves the room
    toObservable(this.matchId)
      .pipe(
        filter(Boolean),
        tap(() => this.liveEvents.set([])),
        switchMap((id) => this.live.watch(id)),
        takeUntilDestroyed(),
      )
      .subscribe((message) => this.applyLive(message));
  }

  /** The event the form just added; the socket echoes it too, and it is kept once. */
  onEventAdded(event: MatchEvent): void {
    this.addLiveEvent(event);
  }

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

  /** Before kick-off the score box shows "vs", like the dash in the list. */
  hasScore(match: Match): boolean {
    return hasScore(match);
  }

  /** LIVE and FINISHED show when the match started, and so does a match cancelled mid-game. */
  showStarted(match: Match): boolean {
    return hasScore(match);
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
        this.liveStatus.set(action.status);
        this.reload();
      },
      error: (error: unknown) => {
        this.isChanging.set(false);
        this.statusError.set(httpErrorMessage(error));
      },
    });
  }

  private applyLive(message: MatchLiveMessage): void {
    switch (message.kind) {
      case 'event':
        this.addLiveEvent(message.event);
        break;
      case 'scoreboard':
        this.liveScoreboard.set(message.scoreboard);
        break;
      case 'reconnected':
        // Catch up on whatever happened while the connection was down
        this.reload();
        break;
      case 'status':
        // Show the new status at once, then load the start and finish times that come with it
        if (message.status !== this.match()?.status) {
          this.liveStatus.set(message.status);
          this.pendingAction.set(null);
          this.reload();
        }
        break;
    }
  }

  private addLiveEvent(event: MatchEvent): void {
    if (!this.liveEvents().some((known) => known.id === event.id)) {
      this.liveEvents.update((events) => [...events, event]);
    }
  }

  private loadPlayers(match: Match): Observable<Participant[]> {
    return forkJoin([
      this.matchesService.playersForTeam(match.homeTeamId),
      this.matchesService.playersForTeam(match.awayTeamId),
    ]).pipe(
      map(([home, away]) => [...home, ...away]),
      // The page still works without player names
      catchError(() => of<Participant[]>([])),
    );
  }

  private reload(): void {
    this.reloadKey.update((key) => key + 1);
  }
}
