import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Participant } from '../../sports/models/hierarchy.model';
import { MATCH_EVENT_TYPES, MATCH_STATUS_ACTIONS } from '../constants/matches.constants';
import {
  Match,
  MatchEvent,
  MatchEventType,
  MatchStats,
  MatchStatus,
  MatchStatusAction,
} from '../models/match.model';

export interface MatchStatsRow {
  type: MatchEventType;
  home: number;
  away: number;
}

/** A score exists once the match has started; before that it is shown as a dash or "vs". */
export function hasScore(match: Pick<Match, 'status' | 'startedAt'>): boolean {
  return match.status === 'LIVE' || match.status === 'FINISHED' || match.startedAt !== null;
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

/**
 * Adds live events to the loaded timeline. An event can arrive twice (the POST response and the
 * socket), so it is kept once; the result stays in minute order like the timeline endpoint.
 */
export function mergeTimeline(loaded: MatchEvent[], live: MatchEvent[]): MatchEvent[] {
  const known = new Set(loaded.map((event) => event.id));
  const added: MatchEvent[] = [];
  for (const event of live) {
    if (!known.has(event.id)) {
      known.add(event.id);
      added.push(event);
    }
  }
  return [...loaded, ...added]
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.minute - b.event.minute || a.index - b.index)
    .map(({ event }) => event);
}

/** Counts live events the loaded stats don't include yet into each team's totals. */
export function withLiveStats(
  stats: MatchStats,
  live: MatchEvent[],
  match: Pick<Match, 'homeTeamId' | 'awayTeamId'>,
): MatchStats {
  if (!live.length) {
    return stats;
  }
  const home = { ...stats.home, events: { ...stats.home.events } };
  const away = { ...stats.away, events: { ...stats.away.events } };
  for (const event of live) {
    const side =
      event.teamId === match.homeTeamId ? home : event.teamId === match.awayTeamId ? away : null;
    if (side) {
      side.events[event.type] = (side.events[event.type] ?? 0) + 1;
    }
  }
  return { ...stats, totalEvents: stats.totalEvents + live.length, home, away };
}

/** Socket events carry only teamId and playerId; the names come from what the page loaded. */
export function nameEvent(event: MatchEvent, match: Match, players: Participant[]): MatchEvent {
  const team =
    [match.homeTeam, match.awayTeam].find((candidate) => candidate?.id === event.teamId) ?? null;
  const player = players.find((candidate) => candidate.id === event.playerId) ?? null;
  return {
    ...event,
    team: event.team ?? team,
    player: event.player ?? player,
  };
}

/** A GOAL only changes the score when it names a team, so the team is required for goals. */
export const goalNeedsTeamValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const type = group.get('type')?.value as string;
  const teamId = group.get('teamId')?.value as string;
  return type === 'GOAL' && !teamId ? { goalNeedsTeam: true } : null;
};
