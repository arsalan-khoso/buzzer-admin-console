import { FormDialogField } from '../../common/components/form-dialog/form-dialog.component';

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

/** Add/Edit Sport dialog fields from the task doc: Name, Description, Icon URL. */
export const SPORT_FORM_FIELDS: FormDialogField[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'iconUrl', label: 'Icon URL', type: 'url' },
];
