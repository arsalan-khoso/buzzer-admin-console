import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Form-level check: home and away must be different teams (the API also rejects it with 400). */
export const differentTeamsValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const home = group.get('homeTeamId')?.value as string | undefined;
  const away = group.get('awayTeamId')?.value as string | undefined;
  return home && away && home === away ? { sameTeam: true } : null;
};

/** ISO date -> value for an <input type="datetime-local"> in the viewer's time zone. */
export function toDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** <input type="datetime-local"> value (local time) -> ISO date for the API. */
export function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}
