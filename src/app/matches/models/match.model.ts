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

export type MatchEventType =
  | 'GOAL'
  | 'FOUL'
  | 'SUBSTITUTION'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'TIMEOUT'
  | 'PENALTY'
  | 'INJURY'
  | 'OTHER';

export interface MatchPlayer {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
}

/** One timeline entry; `team` and `player` are null when the event names none. */
export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  minute: number;
  teamId: string | null;
  playerId: string | null;
  detail: string | null;
  team: Team | null;
  player: MatchPlayer | null;
}

export interface TeamEventCounts {
  team: string;
  events: Partial<Record<MatchEventType, number>>;
}

export interface MatchStats {
  matchId: string;
  totalEvents: number;
  home: TeamEventCounts;
  away: TeamEventCounts;
}

export interface MatchScoreboard {
  matchId: string;
  status: MatchStatus;
  home: { team: string; score: number };
  away: { team: string; score: number };
}

/** A status button on the detail page; `confirm` asks before the change is sent. */
export interface MatchStatusAction {
  status: MatchStatus;
  label: string;
  confirm: boolean;
}

export interface CreateMatchEventInput {
  type: MatchEventType;
  minute: number;
  teamId?: string;
  playerId?: string;
  detail?: string;
}

/** What the match room pushes over Socket.IO. */
export type MatchLiveMessage =
  | { kind: 'event'; event: MatchEvent }
  | { kind: 'scoreboard'; scoreboard: MatchScoreboard }
  | { kind: 'status'; status: MatchStatus }
  /** The connection dropped and came back; anything pushed in between was missed. */
  | { kind: 'reconnected' };
