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
import { GoverningBody } from '../models/hierarchy.model';
import { Sport } from '../models/sport.model';
import { HierarchyService } from '../services/hierarchy.service';

interface SportDetailState {
  sport: Sport | null;
  governingBodies: GoverningBody[];
  error: string;
}

@Component({
  selector: 'app-sport-detail',
  imports: [RouterLink, DatePipe, BreadcrumbComponent, FormDialogComponent],
  templateUrl: './sport-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportDetailComponent {
  private readonly hierarchy = inject(HierarchyService);
  private readonly sportId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('sportId') ?? '')),
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
  readonly breadcrumb = computed(() => [
    { label: 'Sport', link: ['/sports'] },
    { label: this.sport()?.name ?? '…' },
  ]);

  readonly isAddOpen = signal(false);
  readonly addGoverningBody = (value: FormDialogValue) =>
    this.hierarchy.createGoverningBody({
      name: value['name'],
      country: value['country'] || undefined,
      sportId: this.sportId(),
    });

  onAdded(): void {
    this.isAddOpen.set(false);
    this.reloadKey.update((key) => key + 1);
  }
}
