import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { Observable, catchError, combineLatest, forkJoin, map, of, switchMap } from 'rxjs';
import { BreadcrumbComponent } from '../../common/components/breadcrumb/breadcrumb.component';
import { ConfirmDialogComponent } from '../../common/components/confirm-dialog/confirm-dialog.component';
import {
  FormDialogComponent,
  FormDialogField,
  FormDialogValue,
} from '../../common/components/form-dialog/form-dialog.component';
import { ICONS_PATH } from '../../common/constants/navigation.constants';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import { SportDialogComponent } from '../components/sport-dialog/sport-dialog.component';
import { SPORT_ACCENTS } from '../constants/sports.constants';
import { GoverningBody } from '../models/hierarchy.model';
import { Sport } from '../models/sport.model';
import { HierarchyService } from '../services/hierarchy.service';
import { SportsService } from '../services/sports.service';

interface SportDetailState {
  sport: Sport | null;
  governingBodies: GoverningBody[];
  error: string;
}

interface GoverningBodyDialog {
  title: string;
  submitLabel: string;
  initialValue: FormDialogValue;
  save: (value: FormDialogValue) => Observable<unknown>;
}

interface PendingDelete {
  title: string;
  message: string;
  remove: () => Observable<void>;
  /** Where to go after the delete; stays on the page when empty. */
  redirect?: string[];
}

@Component({
  selector: 'app-sport-detail',
  imports: [
    DatePipe,
    BreadcrumbComponent,
    FormDialogComponent,
    ConfirmDialogComponent,
    SportDialogComponent,
  ],
  templateUrl: './sport-detail.component.html',
  styleUrl: './sport-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportDetailComponent {
  /** What the signed-in account may do; action buttons check it. */
  readonly access = inject(AuthService).capabilities;
  private readonly hierarchy = inject(HierarchyService);
  private readonly sportsService = inject(SportsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sportId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('sportId') ?? '')),
    { initialValue: '' },
  );
  private readonly reloadKey = signal(0);

  readonly iconsPath = ICONS_PATH;
  readonly governingBodyFields: FormDialogField[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'country', label: 'Country' },
  ];

  private readonly state = toSignal(
    combineLatest([toObservable(this.sportId), toObservable(this.reloadKey)]).pipe(
      switchMap(([id]) =>
        forkJoin({
          sport: this.hierarchy.getSport(id),
          governingBodies: this.hierarchy.listGoverningBodies(id),
        }).pipe(
          map((data): SportDetailState => ({ ...data, error: '' })),
          catchError((error: unknown) =>
            of<SportDetailState>({
              sport: null,
              governingBodies: [],
              error: httpErrorMessage(error),
            }),
          ),
        ),
      ),
    ),
  );

  readonly sport = computed(() => this.state()?.sport ?? null);
  readonly governingBodies = computed(() => this.state()?.governingBodies ?? []);
  readonly errorMessage = computed(() => this.state()?.error ?? '');
  readonly isLoading = computed(() => this.state() === undefined);
  readonly organisationTotal = computed(() =>
    this.governingBodies().reduce((sum, body) => sum + (body.organizationCount ?? 0), 0),
  );
  readonly participantTotal = computed(() =>
    this.governingBodies().reduce((sum, body) => sum + (body.participantCount ?? 0), 0),
  );
  /** The API stores no colour, so the accent comes from the design system palette. */
  readonly accent = computed(() => {
    const hash = [...this.sportId()].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return SPORT_ACCENTS[hash % SPORT_ACCENTS.length];
  });
  readonly breadcrumb = computed(() => [
    { label: 'Sport', link: ['/sports'] },
    { label: this.sport()?.name ?? '…' },
  ]);

  readonly iconFailed = signal(false);
  readonly isSportFormOpen = signal(false);
  readonly governingBodyDialog = signal<GoverningBodyDialog | null>(null);
  readonly pendingDelete = signal<PendingDelete | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteError = signal('');

  openGoverningBody(body: GoverningBody): void {
    void this.router.navigate(['governing-bodies', body.id], { relativeTo: this.route });
  }

  openAddGoverningBody(): void {
    this.governingBodyDialog.set({
      title: 'Add Governing Body',
      submitLabel: 'Add',
      initialValue: {},
      save: (value) =>
        this.hierarchy.createGoverningBody({
          name: value['name'],
          country: value['country'] || undefined,
          sportId: this.sportId(),
        }),
    });
  }

  openEditGoverningBody(body: GoverningBody): void {
    this.governingBodyDialog.set({
      title: 'Edit Governing Body',
      submitLabel: 'Save',
      initialValue: { name: body.name, country: body.country ?? '' },
      save: (value) =>
        this.hierarchy.updateGoverningBody(body.id, {
          name: value['name'],
          country: value['country'] || undefined,
        }),
    });
  }

  askDeleteGoverningBody(body: GoverningBody): void {
    this.askDelete({
      title: 'Delete Governing Body',
      message: `Delete ${body.name}? It will be removed from every list.`,
      remove: () => this.hierarchy.deleteGoverningBody(body.id),
    });
  }

  askDeleteSport(sport: Sport): void {
    this.askDelete({
      title: 'Delete Sport',
      message: `Delete ${sport.name}? It will be removed from every list.`,
      remove: () => this.sportsService.delete(sport.id),
      redirect: ['/sports'],
    });
  }

  onSaved(): void {
    this.isSportFormOpen.set(false);
    this.governingBodyDialog.set(null);
    this.iconFailed.set(false);
    this.reload();
  }

  confirmDelete(): void {
    const pending = this.pendingDelete();
    if (!pending) {
      return;
    }
    this.isDeleting.set(true);
    pending.remove().subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.pendingDelete.set(null);
        if (pending.redirect) {
          void this.router.navigate(pending.redirect);
        } else {
          this.reload();
        }
      },
      error: (error: unknown) => {
        this.isDeleting.set(false);
        this.deleteError.set(httpErrorMessage(error));
      },
    });
  }

  private askDelete(pending: PendingDelete): void {
    this.deleteError.set('');
    this.pendingDelete.set(pending);
  }

  private reload(): void {
    this.reloadKey.update((key) => key + 1);
  }
}
