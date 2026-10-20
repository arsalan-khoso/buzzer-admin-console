export const SPORTS_ENDPOINTS = {
  sports: 'organizations/sports',
  governingBodies: 'organizations/governing-bodies',
  organisations: 'organizations/organizations',
  teams: 'organizations/teams',
  participants: 'organizations/players',
} as const;

export const SPORTS_PAGE_SIZE = 20;

/** Row accents for sports without an icon, taken from the design system palette. */
export const SPORT_ACCENTS = ['#FFB414', '#EC193C', '#2ED368', '#FF5B14'];

export const STAFF_CATEGORY_LABELS: Record<string, string> = {
  club_president: 'Club President',
  executive_management: 'Executive Management',
  operations_administration: 'Operations & Administration',
};

/** Delay between import requests keeps a large file under the 300 requests/minute limit. */
export const IMPORT_REQUEST_DELAY_MS = 220;

/** Squad and staff writes need an ADMIN or ORG token; OPERATOR and VIEWER get 403. */
export const MEMBER_WRITE_ROLES: readonly string[] = ['ADMIN', 'ORG'];
