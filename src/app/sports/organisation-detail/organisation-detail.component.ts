import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
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
import { AuthService } from '../../core/auth/services/auth.service';
import { MEMBER_WRITE_ROLES, STAFF_CATEGORY_LABELS } from '../constants/sports.constants';
import {
  GoverningBody,
  Organisation,
  Participant,
  SquadMember,
  StaffCategory,
  StaffGroup,
  StaffMember,
  Team,
  UserOption,
} from '../models/hierarchy.model';
import { Sport } from '../models/sport.model';
import { HierarchyService } from '../services/hierarchy.service';

interface DialogConfig {
  title: string;
  submitLabel: string;
  fields: FormDialogField[];
  initialValue: FormDialogValue;
  save: (value: FormDialogValue) => Observable<unknown>;
}

interface RemoveConfig {
  title: string;
  message: string;
  remove: () => Observable<void>;
  redirect?: string[];
}

@Component({
  selector: 'app-organisation-detail',
  imports: [
    DatePipe,
    BreadcrumbComponent,
    FormDialogComponent,
    ConfirmDialogComponent,
    CompetitionDialogComponent,
  ],
  templateUrl: './organisation-detail.component.html',
  styleUrl: './organisation-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationDetailComponent {
  private readonly hierarchy = inject(HierarchyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly iconsPath = ICONS_PATH;
  readonly staffLabels = STAFF_CATEGORY_LABELS;
  private readonly auth = inject(AuthService);
  readonly canManageMembers = computed(() =>
    MEMBER_WRITE_ROLES.includes(this.auth.currentUser()?.role ?? ''),
  );

  readonly sportId = signal('');
  readonly governingBodyId = signal('');
  readonly organisationId = signal('');

  readonly sport = signal<Sport | null>(null);
  readonly governingBody = signal<GoverningBody | null>(null);
  readonly organisation = signal<Organisation | null>(null);
  readonly teams = signal<Team[]>([]);
  readonly participants = signal<Participant[]>([]);
  readonly squad = signal<SquadMember[]>([]);
  readonly staffGroups = signal<StaffGroup[]>([]);
  readonly users = signal<UserOption[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly dialog = signal<DialogConfig | null>(null);
  readonly isCompetitionDialogOpen = signal(false);
  readonly removal = signal<RemoveConfig | null>(null);
  readonly isRemoving = signal(false);
  readonly removeError = signal('');

  readonly breadcrumb = computed(() => [
    { label: 'Sport', link: ['/sports'] },
    { label: this.sport()?.name ?? '…', link: ['/sports', this.sportId()] },
    {
      label: this.governingBody()?.name ?? '…',
      link: ['/sports', this.sportId(), 'governing-bodies', this.governingBodyId()],
    },
    { label: this.organisation()?.name ?? '…' },
  ]);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.sportId.set(params.get('sportId') ?? '');
      this.governingBodyId.set(params.get('governingBodyId') ?? '');
      this.organisationId.set(params.get('organisationId') ?? '');
      this.load();
    });
  }

  load(): void {
    const id = this.organisationId();
    forkJoin({
      sport: this.hierarchy.getSport(this.sportId()),
      governingBody: this.hierarchy.getGoverningBody(this.governingBodyId()),
      organisation: this.hierarchy.getOrganisation(id),
      squad: this.hierarchy.listSquad(id),
      staff: this.hierarchy.listStaff(id),
      teamData: this.hierarchy
        .listTeams(id)
        .pipe(
          switchMap((teams) =>
            teams.length
              ? forkJoin(teams.map((team) => this.hierarchy.listParticipants(team.id))).pipe(
                  map((lists) => ({ teams, participants: lists.flat() })),
                )
              : of({ teams, participants: [] as Participant[] }),
          ),
        ),
    }).subscribe({
      next: (data) => {
        this.sport.set(data.sport);
        this.governingBody.set(data.governingBody);
        this.organisation.set(data.organisation);
        this.squad.set(data.squad);
        this.staffGroups.set(data.staff.groups);
        this.teams.set(data.teamData.teams);
        this.participants.set(data.teamData.participants);
        this.errorMessage.set('');
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(httpErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  openAddTeam(): void {
    this.dialog.set({
      title: 'Add Team',
      submitLabel: 'Add',
      fields: [{ key: 'name', label: 'Team name', required: true }],
      initialValue: {},
      save: (value) =>
        this.hierarchy.createTeam({ name: value['name'], organizationId: this.organisationId() }),
    });
  }

  openParticipant(participant: Participant): void {
    void this.router.navigate(['participants', participant.id], { relativeTo: this.route });
  }

  openEditOrganisation(): void {
    this.isCompetitionDialogOpen.set(true);
  }

  askDeleteOrganisation(organisation: Organisation): void {
    this.askRemove({
      title: 'Delete Organisation',
      message: `Delete ${organisation.name}? It will be removed from every list.`,
      remove: () => this.hierarchy.deleteOrganisation(organisation.id),
      redirect: ['/sports', this.sportId(), 'governing-bodies', this.governingBodyId()],
    });
  }

  openEditParticipant(participant: Participant): void {
    this.dialog.set({
      title: 'Edit Participant',
      submitLabel: 'Save',
      fields: this.participantFields(),
      initialValue: {
        firstName: participant.firstName,
        lastName: participant.lastName,
        jerseyNumber: participant.jerseyNumber?.toString() ?? '',
        position: participant.position ?? '',
        teamId: participant.teamId,
      },
      save: (value) => this.hierarchy.updateParticipant(participant.id, toParticipantInput(value)),
    });
  }

  askDeleteParticipant(participant: Participant): void {
    this.askRemove({
      title: 'Delete Participant',
      message: `Delete ${participant.firstName} ${participant.lastName}?`,
      remove: () => this.hierarchy.deleteParticipant(participant.id),
    });
  }

  openAddParticipant(): void {
    this.dialog.set({
      title: 'Add Participant',
      submitLabel: 'Add',
      fields: this.participantFields(),
      initialValue: { teamId: this.teams().length === 1 ? this.teams()[0].id : '' },
      save: (value) => this.hierarchy.createParticipant(toParticipantInput(value)),
    });
  }

  openAddSquadMember(): void {
    const open = (users: UserOption[]) =>
      this.dialog.set({
        title: 'Add Squad Member',
        submitLabel: 'Add',
        fields: [
          {
            key: 'userId',
            label: 'User',
            type: 'select',
            required: true,
            options: users.map((user) => ({ value: user.id, label: userLabel(user) })),
          },
          { key: 'position', label: 'Position', required: true },
          { key: 'agreementEnd', label: 'Agreement end', type: 'date' },
        ],
        initialValue: {},
        save: (value) =>
          this.hierarchy.addSquadMember(this.organisationId(), {
            userId: value['userId'],
            position: value['position'],
            agreementEnd: toIsoDate(value['agreementEnd']),
          }),
      });

    if (this.users().length) {
      open(this.users());
      return;
    }
    this.hierarchy
      .searchUsers('')
      .pipe(catchError(() => of<UserOption[]>([])))
      .subscribe((users) => {
        this.users.set(users);
        open(users);
      });
  }

  openEditSquadMember(member: SquadMember): void {
    this.dialog.set({
      title: 'Edit Squad Member',
      submitLabel: 'Save',
      fields: [
        { key: 'position', label: 'Position', required: true },
        { key: 'agreementEnd', label: 'Agreement end', type: 'date' },
      ],
      initialValue: {
        position: member.position,
        agreementEnd: member.agreementEnd?.slice(0, 10) ?? '',
      },
      save: (value) =>
        this.hierarchy.updateSquadMember(member.id, {
          position: value['position'],
          agreementEnd: toIsoDate(value['agreementEnd']),
        }),
    });
  }

  askRemoveSquadMember(member: SquadMember): void {
    this.askRemove({
      title: 'Remove Squad Member',
      message: `Remove ${member.displayName} from the squad?`,
      remove: () => this.hierarchy.removeSquadMember(member.id),
    });
  }

  openStaffDialog(member?: StaffMember, category?: StaffCategory): void {
    this.dialog.set({
      title: member ? 'Edit Staff Member' : 'Add Staff Member',
      submitLabel: member ? 'Save' : 'Add',
      fields: [
        { key: 'name', label: 'Name', required: true },
        { key: 'roleTitle', label: 'Role title', required: true },
        {
          key: 'category',
          label: 'Category',
          type: 'select',
          required: true,
          options: Object.entries(STAFF_CATEGORY_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        },
        { key: 'nationality', label: 'Nationality' },
        { key: 'photoUrl', label: 'Photo URL', type: 'url' },
      ],
      initialValue: {
        name: member?.name ?? '',
        roleTitle: member?.roleTitle ?? '',
        category: member?.category ?? category ?? '',
        nationality: member?.nationality ?? '',
        photoUrl: member?.photoUrl ?? '',
      },
      save: (value) => {
        const input = {
          name: value['name'],
          roleTitle: value['roleTitle'],
          category: value['category'] as StaffCategory,
          nationality: value['nationality'] || null,
          photoUrl: value['photoUrl'] || null,
        };
        return member
          ? this.hierarchy.updateStaffMember(member.id, input)
          : this.hierarchy.addStaffMember(this.organisationId(), input);
      },
    });
  }

  askRemoveStaffMember(member: StaffMember): void {
    this.askRemove({
      title: 'Remove Staff Member',
      message: `Remove ${member.name} from the staff?`,
      remove: () => this.hierarchy.removeStaffMember(member.id),
    });
  }

  onSaved(): void {
    this.dialog.set(null);
    this.isCompetitionDialogOpen.set(false);
    this.load();
  }

  confirmRemove(): void {
    const removal = this.removal();
    if (!removal) {
      return;
    }
    this.isRemoving.set(true);
    removal.remove().subscribe({
      next: () => {
        this.isRemoving.set(false);
        this.removal.set(null);
        if (removal.redirect) {
          void this.router.navigate(removal.redirect);
        } else {
          this.load();
        }
      },
      error: (error: unknown) => {
        this.isRemoving.set(false);
        this.removeError.set(httpErrorMessage(error));
      },
    });
  }

  private participantFields(): FormDialogField[] {
    return [
      { key: 'firstName', label: 'First name', required: true },
      { key: 'lastName', label: 'Last name', required: true },
      { key: 'jerseyNumber', label: 'Jersey number', type: 'number' },
      { key: 'position', label: 'Position' },
      {
        key: 'teamId',
        label: 'Team',
        type: 'select',
        required: true,
        options: this.teams().map((team) => ({ value: team.id, label: team.name })),
      },
    ];
  }

  private askRemove(config: RemoveConfig): void {
    this.removeError.set('');
    this.removal.set(config);
  }
}

function userLabel(user: UserOption): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name ? `${name} (${user.email})` : user.email;
}

function toIsoDate(value: string): string | null {
  return value ? new Date(`${value}T00:00:00Z`).toISOString() : null;
}

function toParticipantInput(value: FormDialogValue) {
  return {
    firstName: value['firstName'],
    lastName: value['lastName'],
    jerseyNumber: value['jerseyNumber'] ? Number(value['jerseyNumber']) : undefined,
    position: value['position'] || undefined,
    teamId: value['teamId'],
  };
}
