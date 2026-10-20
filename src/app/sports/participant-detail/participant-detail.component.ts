import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { BreadcrumbComponent } from '../../common/components/breadcrumb/breadcrumb.component';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import { GoverningBody, Organisation, Participant } from '../models/hierarchy.model';
import { Sport } from '../models/sport.model';
import { HierarchyService } from '../services/hierarchy.service';

interface ParticipantState {
  sport: Sport | null;
  governingBody: GoverningBody | null;
  organisation: Organisation | null;
  participant: Participant | null;
  error: string;
}

@Component({
  selector: 'app-participant-detail',
  imports: [DatePipe, BreadcrumbComponent],
  templateUrl: './participant-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantDetailComponent {
  private readonly hierarchy = inject(HierarchyService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  private readonly state = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      switchMap((params) =>
        forkJoin({
          sport: this.hierarchy.getSport(params.get('sportId') ?? ''),
          governingBody: this.hierarchy.getGoverningBody(params.get('governingBodyId') ?? ''),
          organisation: this.hierarchy.getOrganisation(params.get('organisationId') ?? ''),
          participant: this.hierarchy.getParticipant(params.get('participantId') ?? ''),
        }).pipe(
          map((data): ParticipantState => ({ ...data, error: '' })),
          catchError((error: unknown) =>
            of<ParticipantState>({
              sport: null,
              governingBody: null,
              organisation: null,
              participant: null,
              error: httpErrorMessage(error),
            }),
          ),
        ),
      ),
    ),
  );

  readonly participant = computed(() => this.state()?.participant ?? null);
  readonly errorMessage = computed(() => this.state()?.error ?? '');
  readonly breadcrumb = computed(() => {
    const params = this.params();
    const sportId = params.get('sportId') ?? '';
    const governingBodyId = params.get('governingBodyId') ?? '';
    const participant = this.participant();
    return [
      { label: 'Sport', link: ['/sports'] },
      { label: this.state()?.sport?.name ?? '…', link: ['/sports', sportId] },
      {
        label: this.state()?.governingBody?.name ?? '…',
        link: ['/sports', sportId, 'governing-bodies', governingBodyId],
      },
      {
        label: this.state()?.organisation?.name ?? '…',
        link: [
          '/sports',
          sportId,
          'governing-bodies',
          governingBodyId,
          'organisations',
          params.get('organisationId') ?? '',
        ],
      },
      { label: participant ? `${participant.firstName} ${participant.lastName}` : '…' },
    ];
  });
}
