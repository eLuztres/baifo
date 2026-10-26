import { OWNER_EMAIL } from '@/lib/constants';

/** An account as the owner rules need it. */
export interface AccountRef {
  email?: string | null;
  role?: string | null;
}

/** The shop owner (OWNER_EMAIL), above the admins; nobody is when it isn't set. */
export const isOwner = (account: AccountRef, ownerEmail = OWNER_EMAIL) =>
  Boolean(ownerEmail) && account.email?.toLowerCase() === ownerEmail;

/** Whether an admin may edit or delete an account: with an owner set, admins and the owner are the owner's to manage. */
export function canManageUser(caller: AccountRef, target: AccountRef, ownerEmail = OWNER_EMAIL) {
  if (!ownerEmail || isOwner(caller, ownerEmail)) return true;
  return target.role !== 'admin' && !isOwner(target, ownerEmail);
}

/** Whether an admin may give an account this role: only the owner makes new admins. */
export function canGiveRole(caller: AccountRef, target: AccountRef, role: string, ownerEmail = OWNER_EMAIL) {
  if (!canManageUser(caller, target, ownerEmail)) return false;
  return role !== 'admin' || target.role === 'admin' || !ownerEmail || isOwner(caller, ownerEmail);
}
