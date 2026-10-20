export const SPORTS_ENDPOINTS = {
  sports: 'organizations/sports',
  governingBodies: 'organizations/governing-bodies',
  organisations: 'organizations/organizations',
  participants: 'organizations/players',
} as const;

export const SPORTS_PAGE_SIZE = 20;

/** Row accents for sports without an icon, taken from the design system palette. */
export const SPORT_ACCENTS = ['#FFB414', '#EC193C', '#2ED368', '#FF5B14'];
