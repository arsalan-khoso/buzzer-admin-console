import {
  MatchEventType,
  MatchStatus,
  MatchStatusAction,
  MatchStatusTab,
} from '../models/match.model';

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

/**
 * The backend's status rules: SCHEDULED can go LIVE or CANCELLED, LIVE can go FINISHED or
 * CANCELLED, FINISHED and CANCELLED are final. Any other move returns 400.
 */
export const MATCH_STATUS_ACTIONS: Record<MatchStatus, MatchStatusAction[]> = {
  SCHEDULED: [
    { status: 'LIVE', label: 'Start Match', confirm: false },
    { status: 'CANCELLED', label: 'Cancel Match', confirm: true },
  ],
  LIVE: [
    { status: 'FINISHED', label: 'Finish Match', confirm: true },
    { status: 'CANCELLED', label: 'Cancel Match', confirm: true },
  ],
  FINISHED: [],
  CANCELLED: [],
};

/** Event types, in the order the Add Event form and the Stats section list them. */
export const MATCH_EVENT_TYPES: MatchEventType[] = [
  'GOAL',
  'PENALTY',
  'FOUL',
  'YELLOW_CARD',
  'RED_CARD',
  'SUBSTITUTION',
  'TIMEOUT',
  'INJURY',
  'OTHER',
];

export const MATCH_EVENT_LABELS: Record<MatchEventType, string> = {
  GOAL: 'Goal',
  FOUL: 'Foul',
  SUBSTITUTION: 'Substitution',
  YELLOW_CARD: 'Yellow Card',
  RED_CARD: 'Red Card',
  TIMEOUT: 'Timeout',
  PENALTY: 'Penalty',
  INJURY: 'Injury',
  OTHER: 'Other',
};

/** Socket.IO event names of the match room. */
export const MATCH_SOCKET_EVENTS = {
  join: 'match:join',
  leave: 'match:leave',
  event: 'match:event',
  scoreboard: 'match:scoreboard',
  status: 'match:status',
} as const;
