import Link from 'next/link';
import { Plus } from 'lucide-react';
import { isAdmin } from '@/lib/auth-guard';
import { CHOOSES_LISTING_TYPE, NEW_PRODUCT_PATH } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import CreateChooser from './create-chooser';

/** The admin's only tool on the shop: a floating "+" to a new listing; a listing shop asks Anuncio or Evento first. */
const AdminAddButton = async () => {
  const [isAdminUser, { t }] = await Promise.all([isAdmin(), getT()]);
  if (!isAdminUser) return null;

  const props = {
    'aria-label': t('ADMIN_ADD'),
    title: t('ADMIN_ADD'),
    'data-admin-add': true,
    className:
      'fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 hover:bg-primary/90 sm:right-6 sm:bottom-6',
  };
  if (CHOOSES_LISTING_TYPE) {
    return (
      <CreateChooser>
        <button type='button' {...props}>
          <Plus className='size-7' />
        </button>
      </CreateChooser>
    );
  }
  return (
    <Link href={NEW_PRODUCT_PATH} {...props}>
      <Plus className='size-7' />
    </Link>
  );
};

export default AdminAddButton;
