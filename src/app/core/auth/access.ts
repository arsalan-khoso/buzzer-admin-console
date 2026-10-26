import { UserRole } from '../../auth/models/auth.model';

/** What the signed-in account may do; every action button in the console checks one of these. */
export interface Access {
  /** Sports, governing bodies, organisations, teams and participants, including import. */
  manageCatalogue: boolean;
  /** Squad and staff of an organisation. */
  manageMembers: boolean;
  /** Schedule, edit, delete, change status and add events. */
  manageMatches: boolean;
  changePaymentStatus: boolean;
}

export const NO_ACCESS: Access = {
  manageCatalogue: false,
  manageMembers: false,
  manageMatches: false,
  changePaymentStatus: false,
};

/** Permission names from GET /users/:id/permissions. */
export const PERMISSIONS = {
  catalogue: 'organizations:write',
  members: 'org:write',
  matches: 'matches:write',
} as const;

/**
 * Maps the role (GET /auth/me) and the permission list (GET /users/:id/permissions) to actions,
 * matching what the backend accepts for the four demo accounts:
 * - ADMIN: everything.
 * - OPERATOR: catalogue, matches and payment statuses; not squad and staff.
 * - VIEWER: read-only.
 * - ORG: only squad and staff of an organisation, as in Week 1.
 * Squad and staff writes are allowed for ADMIN although its list has no "org:write", and payment
 * statuses for ADMIN and OPERATOR (the backend rule), so those two also look at the role.
 */
export function accessFor(role: UserRole | undefined, permissions: readonly string[]): Access {
  if (!role) {
    return NO_ACCESS;
  }
  return {
    manageCatalogue: permissions.includes(PERMISSIONS.catalogue),
    manageMembers: role === 'ADMIN' || permissions.includes(PERMISSIONS.members),
    manageMatches: permissions.includes(PERMISSIONS.matches),
    changePaymentStatus: role === 'ADMIN' || role === 'OPERATOR',
  };
}
