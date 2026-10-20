export interface GoverningBody {
  id: string;
  name: string;
  country: string | null;
  sportId: string;
  createdAt: string;
  updatedAt: string;
  organizationCount?: number;
  participantCount?: number;
}

export interface Organisation {
  id: string;
  name: string;
  city: string | null;
  governingBodyId: string;
  createdAt: string;
  updatedAt: string;
  governingBody?: GoverningBody;
  teamCount?: number;
  participantCount?: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string | null;
  organizationId: string;
}

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string | null;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  team?: Team;
}

export interface SquadMember {
  id: string;
  userId: string;
  position: string;
  agreementEnd: string | null;
  displayName: string;
  email: string;
  photoUrl: string | null;
  age: number | null;
}

export type StaffCategory = 'club_president' | 'executive_management' | 'operations_administration';

export interface StaffMember {
  id: string;
  name: string;
  roleTitle: string;
  category: StaffCategory;
  nationality: string | null;
  photoUrl: string | null;
}

export interface StaffGroup {
  category: StaffCategory;
  members: StaffMember[];
}

export interface StaffList {
  data: StaffMember[];
  groups: StaffGroup[];
}

export interface UserOption {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}
