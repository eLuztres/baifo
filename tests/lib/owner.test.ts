import { canGiveRole, canManageUser, isOwner } from '@/lib/owner';

const OWNER_EMAIL = 'owner@baifo.es';
const owner = { email: 'Owner@baifo.es', role: 'admin' };
const admin = { email: 'helper@baifo.es', role: 'admin' };
const otherAdmin = { email: 'second@baifo.es', role: 'admin' };
const customer = { email: 'ana@example.com', role: 'user' };

describe('owner rules', () => {
  it('knows the owner by email, whatever the case', () => {
    expect(isOwner(owner, OWNER_EMAIL)).toBe(true);
    expect(isOwner(admin, OWNER_EMAIL)).toBe(false);
  });

  it('lets an admin manage customers but not the owner or other admins', () => {
    expect(canManageUser(admin, customer, OWNER_EMAIL)).toBe(true);
    expect(canManageUser(admin, owner, OWNER_EMAIL)).toBe(false);
    expect(canManageUser(admin, otherAdmin, OWNER_EMAIL)).toBe(false);
  });

  it('lets the owner manage everyone', () => {
    expect(canManageUser(owner, admin, OWNER_EMAIL)).toBe(true);
    expect(canManageUser(owner, customer, OWNER_EMAIL)).toBe(true);
  });

  it('lets only the owner make new admins', () => {
    expect(canGiveRole(admin, customer, 'admin', OWNER_EMAIL)).toBe(false);
    expect(canGiveRole(admin, customer, 'user', OWNER_EMAIL)).toBe(true);
    expect(canGiveRole(owner, customer, 'admin', OWNER_EMAIL)).toBe(true);
  });

  it('keeps the old rules when no owner is set', () => {
    expect(canManageUser(admin, otherAdmin, '')).toBe(true);
    expect(canGiveRole(admin, customer, 'admin', '')).toBe(true);
    expect(isOwner(owner, '')).toBe(false);
  });
});
