import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, concatMap, delay, from, map, of, scan } from 'rxjs';
import { IMPORT_REQUEST_DELAY_MS } from '../constants/sports.constants';
import { SportInput } from '../models/sport.model';
import { SportsService } from './sports.service';

export interface ImportProgress {
  total: number;
  processed: number;
  added: number;
  skipped: number;
  failures: { name: string; reason: string }[];
}

/**
 * Imports sports from CSV or JSON. There is no bulk endpoint, so rows are POSTed one at a time
 * (never in parallel, to stay under the rate limit): 201 = added, 409 = skipped duplicate,
 * anything else = failure.
 */
@Injectable({ providedIn: 'root' })
export class SportImportService {
  private readonly sportsService = inject(SportsService);

  parse(fileName: string, content: string): SportInput[] {
    const rows = fileName.toLowerCase().endsWith('.json') ? parseJson(content) : parseCsv(content);
    return rows
      .map((row) => ({
        name: String(row['name'] ?? '').trim(),
        description: String(row['description'] ?? '').trim() || undefined,
        iconUrl: String(row['iconUrl'] ?? '').trim() || undefined,
      }))
      .filter((row) => row.name !== '');
  }

  import(rows: SportInput[]): Observable<ImportProgress> {
    const initial: ImportProgress = {
      total: rows.length,
      processed: 0,
      added: 0,
      skipped: 0,
      failures: [],
    };
    return from(rows).pipe(
      concatMap((row, index) =>
        this.sportsService.create(row).pipe(
          map(() => ({ row, outcome: 'added' as const, reason: '' })),
          catchError((error: unknown) =>
            of(
              error instanceof HttpErrorResponse && error.status === 409
                ? { row, outcome: 'skipped' as const, reason: '' }
                : { row, outcome: 'failed' as const, reason: describe(error) },
            ),
          ),
          delay(index === rows.length - 1 ? 0 : IMPORT_REQUEST_DELAY_MS),
        ),
      ),
      scan(
        (progress, result) => ({
          ...progress,
          processed: progress.processed + 1,
          added: progress.added + (result.outcome === 'added' ? 1 : 0),
          skipped: progress.skipped + (result.outcome === 'skipped' ? 1 : 0),
          failures:
            result.outcome === 'failed'
              ? [...progress.failures, { name: result.row.name, reason: result.reason }]
              : progress.failures,
        }),
        initial,
      ),
    );
  }
}

function describe(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: { message?: string } } | null;
    return body?.error?.message ?? `HTTP ${error.status}`;
  }
  return 'Unknown error';
}

function parseJson(content: string): Record<string, unknown>[] {
  const data: unknown = JSON.parse(content);
  if (!Array.isArray(data)) {
    throw new Error('The JSON file must contain an array of sports.');
  }
  return data as Record<string, unknown>[];
}

/** Minimal CSV parser: header row, comma separated, double quotes for values with commas. */
export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (!lines.length) {
    return [];
  }
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? '']));
  });
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && inQuotes && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}
