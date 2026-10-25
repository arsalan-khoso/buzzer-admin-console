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
import { CompetitionDialogComponent } from '../components/competition-dialog/competition-dialog.component';
import { GoverningBody, Organisation } from '../models/hierarchy.model';
import { Sport } from '../models/sport.model';
import { HierarchyService } from '../services/hierarchy.service';

interface GoverningBodyState {
  sport: Sport | null;
  governingBody: GoverningBody | null;
  organisations: Organisation[];
  error: string;
}

interface EditDialog {
  title: string;
  submitLabel: string;
  fields: FormDialogField[];
  initialValue: FormDialogValue;
  save: (value: FormDialogValue) => Observable<unknown>;
}

interface PendingDelete {
  title: string;
  message: string;
  remove: () => Observable<void>;
  redirect?: string[];
}

@Component({
  selector: 'app-governing-body-detail',
  imports: [
    DatePipe,
    BreadcrumbComponent,
    FormDialogComponent,
    ConfirmDialogComponent,
    CompetitionDialogComponent,
  ],
  templateUrl: './governing-body-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoverningBodyDetailComponent {
  /** What the signed-in account may do; action buttons check it. */
  readonly access = inject(AuthService).capabilities;
  private readonly hierarchy = inject(HierarchyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly sportId = computed(() => this.params().get('sportId') ?? '');
  readonly governingBodyId = computed(() => this.params().get('governingBodyId') ?? '');
  private readonly reloadKey = signal(0);

  readonly iconsPath = ICONS_PATH;

  private readonly state = toSignal(
    combineLatest([
      toObservable(this.sportId),
      toObservable(this.governingBodyId),
      toObservable(this.reloadKey),
    ]).pipe(
      switchMap(([sportId, id]) =>
        forkJoin({
          sport: this.hierarchy.getSport(sportId),
          governingBody: this.hierarchy.getGoverningBody(id),
          organisations: this.hierarchy.listOrganisations(id),
        }).pipe(
          map((data): GoverningBodyState => ({ ...data, error: '' })),
          catchError((error: unknown) =>
            of<GoverningBodyState>({
              sport: null,
              governingBody: null,
              organisations: [],
              error: httpErrorMessage(error),
            }),
          ),
        ),
      ),
    ),
  );

  readonly governingBody = computed(() => this.state()?.governingBody ?? null);
  readonly organisations = computed(() => this.state()?.organisations ?? []);
  readonly errorMessage = computed(() => this.state()?.error ?? '');
  readonly isLoading = computed(() => this.state() === undefined);
  readonly participantTotal = computed(() =>
    this.organisations().reduce(
      (sum, organisation) => sum + (organisation.participantCount ?? 0),
      0,
    ),
  );
  readonly breadcrumb = computed(() => [
    { label: 'Sport', link: ['/sports'] },
    { label: this.state()?.sport?.name ?? '…', link: ['/sports', this.sportId()] },
    { label: this.governingBody()?.name ?? '…' },
  ]);

  readonly dialog = signal<EditDialog | null>(null);
  /** Open Add/Edit Competition dialog; `organisation` is empty when adding. */
  readonly competitionDialog = signal<{ organisation: Organisation | null } | null>(null);
  readonly pendingDelete = signal<PendingDelete | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteError = signal('');

  openOrganisation(organisation: Organisation): void {
    void this.router.navigate(['organisations', organisation.id], { relativeTo: this.route });
  }

  openEditGoverningBody(body: GoverningBody): void {
    this.dialog.set({
      title: 'Edit Governing Body',
      submitLabel: 'Save',
      fields: [
        { key: 'name', label: 'Name', required: true },
        { key: 'country', label: 'Country' },
      ],
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
      redirect: ['/sports', this.sportId()],
    });
  }

  openAddOrganisation(): void {
    this.competitionDialog.set({ organisation: null });
  }

  openEditOrganisation(organisation: Organisation): void {
    this.competitionDialog.set({ organisation });
  }

  askDeleteOrganisation(organisation: Organisation): void {
    this.askDelete({
      title: 'Delete Organisation',
      message: `Delete ${organisation.name}? It will be removed from every list.`,
      remove: () => this.hierarchy.deleteOrganisation(organisation.id),
    });
  }

  onSaved(): void {
    this.dialog.set(null);
    this.competitionDialog.set(null);
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
