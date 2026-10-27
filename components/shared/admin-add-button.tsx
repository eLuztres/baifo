import Link from 'next/link';
import { Plus } from 'lucide-react';
import { isAdmin } from '@/lib/auth-guard';
import { NEW_PRODUCT_PATH } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

/** The admin's only tool on the shop: a floating "+" straight to a new listing, where the type is chosen. */
const AdminAddButton = async () => {
  const [isAdminUser, { t }] = await Promise.all([isAdmin(), getT()]);
  if (!isAdminUser) return null;

  return (
    <Link
      href={NEW_PRODUCT_PATH}
      aria-label={t('ADMIN_ADD')}
      title={t('ADMIN_ADD')}
      className='fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 hover:bg-primary/90 sm:right-6 sm:bottom-6'
    >
      <Plus className='size-7' />
    </Link>
  );
};

export default AdminAddButton;
