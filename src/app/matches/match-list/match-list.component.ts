import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { catchError, debounceTime, map, of, skip, startWith, switchMap } from 'rxjs';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { ICONS_PATH } from '../../common/constants/navigation.constants';
import { LayoutService } from '../../common/services/layout.service';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import { SortOrder } from '../../core/models/api.model';
import { MatchDialogComponent } from '../components/match-dialog/match-dialog.component';
import {
  MATCHES_PAGE_SIZE,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_TABS,
  MATCH_STATUS_TAGS,
} from '../constants/matches.constants';
import { Match, MatchStatus } from '../models/match.model';
import { MatchesService } from '../services/matches.service';
import { hasScore } from '../utils/match-detail.util';

interface ListState {
  matches: Match[];
  totalPages: number;
  isLoading: boolean;
  error: string;
}

const LOADING_STATE: ListState = { matches: [], totalPages: 1, isLoading: true, error: '' };

@Component({
  selector: 'app-match-list',
  imports: [DatePipe, MatchDialogComponent, ConfirmDialogComponent],
  templateUrl: './match-list.component.html',
  styleUrl: './match-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchListComponent {
  /** What the signed-in account may do; action buttons check it. */
  readonly access = inject(AuthService).capabilities;
  private readonly matchesService = inject(MatchesService);
  private readonly layout = inject(LayoutService);
  private readonly search = this.layout.searchQuery;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly iconsPath = ICONS_PATH;
  readonly tabs = MATCH_STATUS_TABS;
  readonly statusLabels = MATCH_STATUS_LABELS;
  readonly statusTags = MATCH_STATUS_TAGS;

  /** Tab and page live in the URL, so a reload or coming back keeps them. */
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly status = computed<MatchStatus | ''>(() => {
    const status = this.queryParams().get('status') ?? '';
    return this.tabs.some((tab) => tab.status === status) ? (status as MatchStatus | '') : '';
  });
  readonly page = computed(() => Math.max(Number(this.queryParams().get('page')) || 1, 1));
  readonly sortOrder = signal<SortOrder>('desc');
  private readonly reloadKey = signal(0);

  private readonly state = toSignal(
    toObservable(
      computed(() => ({
        status: this.status(),
        search: this.search().trim(),
        page: this.page(),
        sortOrder: this.sortOrder(),
        reload: this.reloadKey(),
      })),
    ).pipe(
      debounceTime(300),
      switchMap(({ status, search, page, sortOrder }) =>
        this.matchesService
          .list({
            status,
            search,
            page,
            limit: MATCHES_PAGE_SIZE,
            sortBy: 'scheduledAt',
            sortOrder,
          })
          .pipe(
            map((result): ListState => ({
              matches: result.items,
              totalPages: Math.max(result.meta.totalPages, 1),
              isLoading: false,
              error: '',
            })),
            catchError((error: unknown) =>
              of<ListState>({
                matches: [],
                totalPages: 1,
                isLoading: false,
                error: httpErrorMessage(error),
              }),
            ),
            startWith<ListState>(LOADING_STATE),
          ),
      ),
    ),
    { initialValue: LOADING_STATE },
  );

  readonly matches = computed(() => this.state().matches);
  readonly totalPages = computed(() => this.state().totalPages);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly errorMessage = computed(() => this.state().error);

  readonly editingMatch = signal<Match | null>(null);
  readonly isFormOpen = signal(false);
  readonly deletingMatch = signal<Match | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteError = signal('');

  constructor() {
    // The backend matches the search against the venue only
    this.layout.setSearchPlaceholder('Search by venue');
    inject(DestroyRef).onDestroy(() => this.layout.setSearchPlaceholder(null));

    // A new search always starts from the first page
    toObservable(this.search)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.setQuery({ page: null }));

    // Deleting the last row of the last page, or an old link, can point past the end
    effect(() => {
      const { isLoading, error, totalPages } = this.state();
      if (!isLoading && !error && this.page() > totalPages) {
        untracked(() => this.goToPage(totalPages));
      }
    });
  }

  selectTab(status: MatchStatus | ''): void {
    this.setQuery({ status: status || null, page: null });
  }

  goToPage(page: number): void {
    const target = Math.min(Math.max(page, 1), this.totalPages());
    this.setQuery({ page: target > 1 ? target : null });
  }

  toggleSort(): void {
    this.sortOrder.update((order) => (order === 'asc' ? 'desc' : 'asc'));
    this.setQuery({ page: null });
  }

  /** Before kick-off the score column shows a dash. */
  hasScore(match: Match): boolean {
    return hasScore(match);
  }

  /** The tab and page go along, so the detail page's breadcrumb returns to the same view. */
  openMatch(match: Match): void {
    void this.router.navigate([match.id], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  openSchedule(): void {
    this.editingMatch.set(null);
    this.isFormOpen.set(true);
  }

  openEdit(match: Match): void {
    this.editingMatch.set(match);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingMatch.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.reload();
  }

  askDelete(match: Match): void {
    this.deleteError.set('');
    this.deletingMatch.set(match);
  }

  confirmDelete(): void {
    const match = this.deletingMatch();
    if (!match) {
      return;
    }
    this.isDeleting.set(true);
    this.matchesService.delete(match.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deletingMatch.set(null);
        this.reload();
      },
      error: (error: unknown) => {
        this.isDeleting.set(false);
        this.deleteError.set(httpErrorMessage(error));
      },
    });
  }

  matchName(match: Match): string {
    return `${match.homeTeam?.name ?? 'Home'} vs ${match.awayTeam?.name ?? 'Away'}`;
  }

  private setQuery(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private reload(): void {
    this.reloadKey.update((key) => key + 1);
  }
}
