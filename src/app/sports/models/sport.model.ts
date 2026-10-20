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

/** Builds the API payload from the sport dialog values; empty optional fields are left out. */
export function toSportInput(value: Record<string, string>): SportInput {
  const input: SportInput = { name: value['name'] };
  if (value['description']) {
    input.description = value['description'];
  }
  if (value['iconUrl']) {
    input.iconUrl = value['iconUrl'];
  }
  return input;
}
