import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, forkJoin, map, of, switchMap } from 'rxjs';
import { BreadcrumbComponent } from '../../common/components/breadcrumb/breadcrumb.component';
import {
  FormDialogComponent,
  FormDialogField,
  FormDialogValue,
} from '../../common/components/form-dialog/form-dialog.component';
import { ICONS_PATH } from '../../common/constants/navigation.constants';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import { GoverningBody, Organisation } from '../models/hierarchy.model';
import { Sport } from '../models/sport.model';
import { HierarchyService } from '../services/hierarchy.service';

interface GoverningBodyState {
  sport: Sport | null;
  governingBody: GoverningBody | null;
  organisations: Organisation[];
  error: string;
}

@Component({
  selector: 'app-governing-body-detail',
  imports: [RouterLink, DatePipe, BreadcrumbComponent, FormDialogComponent],
  templateUrl: './governing-body-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoverningBodyDetailComponent {
  private readonly hierarchy = inject(HierarchyService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });
  private readonly sportId = computed(() => this.params().get('sportId') ?? '');
  private readonly governingBodyId = computed(() => this.params().get('governingBodyId') ?? '');
  private readonly reloadKey = signal(0);

  readonly iconsPath = ICONS_PATH;
  readonly organisationFields: FormDialogField[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'city', label: 'City' },
  ];

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
  readonly breadcrumb = computed(() => [
    { label: 'Sport', link: ['/sports'] },
    { label: this.state()?.sport?.name ?? '…', link: ['/sports', this.sportId()] },
    { label: this.governingBody()?.name ?? '…' },
  ]);

  readonly isAddOpen = signal(false);
  readonly addOrganisation = (value: FormDialogValue) =>
    this.hierarchy.createOrganisation({
      name: value['name'],
      city: value['city'] || undefined,
      governingBodyId: this.governingBodyId(),
    });

  onAdded(): void {
    this.isAddOpen.set(false);
    this.reloadKey.update((key) => key + 1);
  }
}
