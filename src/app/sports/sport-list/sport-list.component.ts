import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, skip, startWith, switchMap } from 'rxjs';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import { ICONS_PATH } from '../../common/constants/navigation.constants';
import { LayoutService } from '../../common/services/layout.service';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import { SportFormDialogComponent } from '../components/sport-form-dialog/sport-form-dialog.component';
import { SPORT_ACCENTS, SPORTS_PAGE_SIZE } from '../constants/sports.constants';
import { CatalogueTotals, Sport } from '../models/sport.model';
import { SportsService } from '../services/sports.service';

interface ListState {
  sports: Sport[];
  totalPages: number;
  isLoading: boolean;
  error: string;
}

const LOADING_STATE: ListState = { sports: [], totalPages: 1, isLoading: true, error: '' };

@Component({
  selector: 'app-sport-list',
  imports: [SportFormDialogComponent, ConfirmDialogComponent],
  templateUrl: './sport-list.component.html',
  styleUrl: './sport-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportListComponent {
  private readonly sportsService = inject(SportsService);
  private readonly search = inject(LayoutService).searchQuery;

  readonly iconsPath = ICONS_PATH;
  readonly page = signal(1);
  private readonly reloadKey = signal(0);

  /** Search runs on the server (?search=), so the table only ever shows one page from the API. */
  private readonly state = toSignal(
    toObservable(
      computed(() => ({
        search: this.search().trim(),
        page: this.page(),
        reload: this.reloadKey(),
      })),
    ).pipe(
      debounceTime(300),
      switchMap(({ search, page }) =>
        this.sportsService.list({ search, page, limit: SPORTS_PAGE_SIZE }).pipe(
          map((result): ListState => ({
            sports: result.items,
            totalPages: Math.max(result.meta.totalPages, 1),
            isLoading: false,
            error: '',
          })),
          catchError((error: unknown) =>
            of<ListState>({
              sports: [],
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

  readonly sports = computed(() => this.state().sports);
  readonly totalPages = computed(() => this.state().totalPages);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly errorMessage = computed(() => this.state().error);

  readonly totals = toSignal(
    toObservable(this.reloadKey).pipe(
      switchMap(() =>
        this.sportsService.totals().pipe(catchError(() => of<CatalogueTotals | null>(null))),
      ),
    ),
    { initialValue: null },
  );

  readonly editingSport = signal<Sport | null>(null);
  readonly isFormOpen = signal(false);
  readonly deletingSport = signal<Sport | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteError = signal('');

  constructor() {
    // A new search always starts from the first page
    toObservable(this.search)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.page.set(1));
  }

  accent(index: number): string {
    return SPORT_ACCENTS[index % SPORT_ACCENTS.length];
  }

  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(page, 1), this.totalPages()));
  }

  openAdd(): void {
    this.editingSport.set(null);
    this.isFormOpen.set(true);
  }

  openEdit(sport: Sport): void {
    this.editingSport.set(sport);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingSport.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.reload();
  }

  askDelete(sport: Sport): void {
    this.deleteError.set('');
    this.deletingSport.set(sport);
  }

  confirmDelete(): void {
    const sport = this.deletingSport();
    if (!sport) {
      return;
    }
    this.isDeleting.set(true);
    this.sportsService.delete(sport.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deletingSport.set(null);
        this.reload();
      },
      error: (error: unknown) => {
        this.isDeleting.set(false);
        this.deleteError.set(httpErrorMessage(error));
      },
    });
  }

  private reload(): void {
    this.reloadKey.update((key) => key + 1);
  }
}
