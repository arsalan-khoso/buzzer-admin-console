import { MatchStatus, MatchStatusTab } from '../models/match.model';

export const MATCHES_ENDPOINT = 'matches';

export const MATCHES_PAGE_SIZE = 20;

/** The dialog loads every sport and team in one request; the API caps a page at 100. */
export const MATCH_DIALOG_OPTIONS_LIMIT = 100;

export const MATCH_STATUS_TABS: MatchStatusTab[] = [
  { label: 'All', status: '' },
  { label: 'Scheduled', status: 'SCHEDULED' },
  { label: 'Live', status: 'LIVE' },
  { label: 'Finished', status: 'FINISHED' },
  { label: 'Cancelled', status: 'CANCELLED' },
];

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
};

/** Tag modifier per status, from the design system accents. */
export const MATCH_STATUS_TAGS: Record<MatchStatus, string> = {
  SCHEDULED: 'tag--accent',
  LIVE: 'tag--success',
  FINISHED: '',
  CANCELLED: 'tag--danger',
};
