import { FormControl, FormGroup } from '@angular/forms';
import { differentTeamsValidator, fromDateTimeInput, toDateTimeInput } from './match-form.util';

function teamsForm(home: string, away: string): FormGroup {
  return new FormGroup(
    { homeTeamId: new FormControl(home), awayTeamId: new FormControl(away) },
    { validators: differentTeamsValidator },
  );
}

describe('match form utils', () => {
  it('should block the same team as home and away', () => {
    expect(teamsForm('team-1', 'team-1').hasError('sameTeam')).toBe(true);
  });

  it('should accept two different teams', () => {
    expect(teamsForm('team-1', 'team-2').hasError('sameTeam')).toBe(false);
  });

  it('should not flag the pair while a team is still missing', () => {
    expect(teamsForm('', '').hasError('sameTeam')).toBe(false);
    expect(teamsForm('team-1', '').hasError('sameTeam')).toBe(false);
  });

  it('should round-trip a date through the datetime-local input', () => {
    const iso = new Date(2026, 9, 22, 18, 30).toISOString();
    expect(toDateTimeInput(iso)).toBe('2026-10-22T18:30');
    expect(fromDateTimeInput('2026-10-22T18:30')).toBe(iso);
  });

  it('should leave the input empty for an invalid date', () => {
    expect(toDateTimeInput('not a date')).toBe('');
  });
});
