import { MATCH_EVENT_TYPES, MATCH_STATUS_ACTIONS } from '../constants/matches.constants';
import { MatchEventType, MatchStats, MatchStatus, MatchStatusAction } from '../models/match.model';

export interface MatchStatsRow {
  type: MatchEventType;
  home: number;
  away: number;
}

/** The status buttons for a match: only the moves the backend accepts from `status`. */
export function statusActions(status: MatchStatus): MatchStatusAction[] {
  return MATCH_STATUS_ACTIONS[status] ?? [];
}

/** One row per event type that either team has, in a fixed order. */
export function statsRows(stats: MatchStats): MatchStatsRow[] {
  return MATCH_EVENT_TYPES.map((type) => ({
    type,
    home: stats.home.events[type] ?? 0,
    away: stats.away.events[type] ?? 0,
  })).filter((row) => row.home + row.away > 0);
}
