import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { isAdmin } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';

interface AdminEditButtonProps {
  productId: string;
  /** The marketplace listing the product came from; old shop products have none. */
  submissionId?: string;
  className?: string;
}

/** On a listing page, the admin's small pencil beside the title, straight to its editor. Not floating: it must never cover the listing. */
const AdminEditButton = async ({ productId, submissionId, className }: AdminEditButtonProps) => {
  const [isAdminUser, { t }] = await Promise.all([isAdmin(), getT()]);
  if (!isAdminUser) return null;

  const href = submissionId ? `/admin/listings/${submissionId}` : `/admin/products/${productId}`;
  return (
    <Link
      href={href}
      aria-label={t('ADMIN_EDIT_LISTING')}
      title={t('ADMIN_EDIT_LISTING')}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'size-10 shrink-0 rounded-full text-muted-foreground hover:text-primary',
        className,
      )}
    >
      <Pencil className='size-5' />
    </Link>
  );
};

export default AdminEditButton;
