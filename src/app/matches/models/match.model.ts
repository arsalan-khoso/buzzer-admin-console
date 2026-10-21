import { Team } from '../../sports/models/hierarchy.model';
import { Sport } from '../../sports/models/sport.model';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export interface Match {
  id: string;
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  createdBy: string | null;
  sport?: Sport;
  homeTeam?: Team;
  awayTeam?: Team;
}

export interface CreateMatchInput {
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  venue?: string;
}

export interface UpdateMatchInput {
  scheduledAt?: string;
  venue?: string;
}

/** One status tab: `status` is empty for "All". */
export interface MatchStatusTab {
  label: string;
  status: MatchStatus | '';
}
