import { Access, NO_ACCESS, accessFor } from './access';

// The permission lists GET /users/:id/permissions returns for the four demo accounts
const PERMISSION_LISTS = {
  ADMIN: [
    'users:read',
    'users:write',
    'matches:write',
    'payments:read',
    'payments:write',
    'templates:write',
    'config:write',
    'requests:approve',
    'organizations:write',
    'analytics:read',
  ],
  OPERATOR: [
    'users:read',
    'matches:write',
    'payments:read',
    'templates:write',
    'requests:create',
    'organizations:write',
    'analytics:read',
  ],
  VIEWER: ['users:read', 'payments:read', 'analytics:read', 'requests:create'],
  ORG: ['users:read', 'org:write', 'analytics:read', 'requests:create'],
} as const;

describe('role checks', () => {
  const expectAccess = (role: keyof typeof PERMISSION_LISTS, expected: Access) =>
    expect(accessFor(role, PERMISSION_LISTS[role])).toEqual(expected);

  it('should let ADMIN do everything', () => {
    expectAccess('ADMIN', {
      manageCatalogue: true,
      manageMembers: true,
      manageMatches: true,
      changePaymentStatus: true,
    });
  });

  it('should let OPERATOR manage matches, payment statuses and the catalogue, not members', () => {
    expectAccess('OPERATOR', {
      manageCatalogue: true,
      manageMembers: false,
      manageMatches: true,
      changePaymentStatus: true,
    });
  });

  it('should keep VIEWER read-only', () => {
    expectAccess('VIEWER', NO_ACCESS);
  });

  it('should let ORG manage squad and staff only', () => {
    expectAccess('ORG', {
      manageCatalogue: false,
      manageMembers: true,
      manageMatches: false,
      changePaymentStatus: false,
    });
  });

  it('should allow nothing before the user is known', () => {
    expect(accessFor(undefined, PERMISSION_LISTS.ADMIN)).toEqual(NO_ACCESS);
  });

  it('should follow the permission list, not only the role', () => {
    expect(accessFor('OPERATOR', []).manageMatches).toBe(false);
    expect(accessFor('VIEWER', ['matches:write']).manageMatches).toBe(true);
  });
});
