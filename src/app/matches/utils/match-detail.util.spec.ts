import { FormControl, FormGroup } from '@angular/forms';
import { Participant } from '../../sports/models/hierarchy.model';
import { Match, MatchEvent, MatchStats } from '../models/match.model';
import {
  goalNeedsTeamValidator,
  mergeTimeline,
  nameEvent,
  statsRows,
  statusActions,
  withLiveStats,
} from './match-detail.util';

const statuses = (status: Parameters<typeof statusActions>[0]) =>
  statusActions(status).map((action) => action.status);

describe('match detail utils', () => {
  it('should let a scheduled match go live or be cancelled', () => {
    expect(statuses('SCHEDULED')).toEqual(['LIVE', 'CANCELLED']);
  });

  it('should let a live match finish or be cancelled', () => {
    expect(statuses('LIVE')).toEqual(['FINISHED', 'CANCELLED']);
  });

  it('should treat finished and cancelled as final', () => {
    expect(statuses('FINISHED')).toEqual([]);
    expect(statuses('CANCELLED')).toEqual([]);
  });

  it('should ask for confirmation before Cancel and Finish only', () => {
    const confirmed = [...statusActions('SCHEDULED'), ...statusActions('LIVE')]
      .filter((action) => action.confirm)
      .map((action) => action.status);
    expect(confirmed).toEqual(['CANCELLED', 'FINISHED', 'CANCELLED']);
  });

  it('should build one stats row per event type either team has', () => {
    const stats: MatchStats = {
      matchId: 'm1',
      totalEvents: 4,
      home: { team: 'Home', events: { FOUL: 1, GOAL: 2 } },
      away: { team: 'Away', events: { GOAL: 1 } },
    };
    expect(statsRows(stats)).toEqual([
      { type: 'GOAL', home: 2, away: 1 },
      { type: 'FOUL', home: 1, away: 0 },
    ]);
  });
});

describe('live match utils', () => {
  const event = (id: string, minute: number, teamId: string | null = 'home'): MatchEvent => ({
    id,
    matchId: 'm1',
    type: 'GOAL',
    minute,
    teamId,
    playerId: null,
    detail: null,
    team: null,
    player: null,
  });
  const stats: MatchStats = {
    matchId: 'm1',
    totalEvents: 1,
    home: { team: 'Home', events: { GOAL: 1 } },
    away: { team: 'Away', events: {} },
  };
  const sides = { homeTeamId: 'home', awayTeamId: 'away' };

  it('should keep an event that arrives twice only once', () => {
    const merged = mergeTimeline(
      [event('a', 10)],
      [event('b', 20), event('b', 20), event('a', 10)],
    );
    expect(merged.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('should keep the timeline in minute order', () => {
    const merged = mergeTimeline([event('a', 10), event('c', 30)], [event('b', 20)]);
    expect(merged.map((item) => item.minute)).toEqual([10, 20, 30]);
  });

  it('should count live events into the team stats', () => {
    const result = withLiveStats(stats, [event('b', 20, 'away'), event('c', 30, null)], sides);
    expect(result.away.events.GOAL).toBe(1);
    expect(result.home.events.GOAL).toBe(1);
    expect(result.totalEvents).toBe(3);
    expect(stats.away.events.GOAL).toBeUndefined();
  });

  it('should name the team and player of a socket event', () => {
    const match = {
      homeTeam: { id: 'home', name: 'Home FC', shortName: null, organizationId: 'o' },
      awayTeam: { id: 'away', name: 'Away FC', shortName: null, organizationId: 'o' },
    } as Match;
    const player = { id: 'p1', firstName: 'Ann', lastName: 'Lee', jerseyNumber: 9 } as Participant;
    const named = nameEvent({ ...event('a', 5, 'away'), playerId: 'p1' }, match, [player]);
    expect(named.team?.name).toBe('Away FC');
    expect(named.player?.firstName).toBe('Ann');
  });

  it('should require a team for a goal only', () => {
    const form = (type: string, teamId: string) =>
      new FormGroup(
        { type: new FormControl(type), teamId: new FormControl(teamId) },
        { validators: goalNeedsTeamValidator },
      );
    expect(form('GOAL', '').hasError('goalNeedsTeam')).toBe(true);
    expect(form('GOAL', 'home').hasError('goalNeedsTeam')).toBe(false);
    expect(form('FOUL', '').hasError('goalNeedsTeam')).toBe(false);
  });
});
