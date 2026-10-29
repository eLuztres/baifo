import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { isAdmin } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';

interface AdminEditButtonProps {
  productId: string;
  /** The marketplace listing the product came from; old shop products have none. */
  submissionId?: string;
}

/** On a listing page, the admin's floating pencil straight to its editor: beside the "+" on phones, above it on wider screens. */
const AdminEditButton = async ({ productId, submissionId }: AdminEditButtonProps) => {
  const [isAdminUser, { t }] = await Promise.all([isAdmin(), getT()]);
  if (!isAdminUser) return null;

  const href = submissionId ? `/admin/listings/${submissionId}` : `/admin/products/${productId}`;
  return (
    <Link
      href={href}
      aria-label={t('ADMIN_EDIT_LISTING')}
      title={t('ADMIN_EDIT_LISTING')}
      data-admin-edit
      className='fixed right-20 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 hover:bg-primary/90 sm:right-6 sm:bottom-23'
    >
      <Pencil className='size-6' />
    </Link>
  );
};

export default AdminEditButton;
