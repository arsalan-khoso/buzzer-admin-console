import { MatchStats } from '../models/match.model';
import { statsRows, statusActions } from './match-detail.util';

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
