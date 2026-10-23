import type { Translator } from '@/lib/i18n-core';

/** Display name of a user role; shop-specific roles from USER_ROLES show as written, capitalized. */
export function roleLabel(t: Translator, role: string) {
  if (role === 'admin') return t('ADMIN_ROLE_ADMIN');
  if (role === 'user') return t('ADMIN_ROLE_USER');
  return role.charAt(0).toUpperCase() + role.slice(1);
}
