export interface Sport {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: string;
  updatedAt: string;
  governingBodyCount?: number;
  organizationCount?: number;
  participantCount?: number;
}

export interface SportInput {
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface CatalogueTotals {
  sports: number;
  governingBodies: number;
  organisations: number;
  participants: number;
}
