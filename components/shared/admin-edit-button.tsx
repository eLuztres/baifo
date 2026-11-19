import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { isAdmin } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';
import { getSignedInPartner } from '@/lib/partner-access';
import { partnerListingPath } from '@/lib/partner-paths';
import { cn } from '@/lib/utils';

interface AdminEditButtonProps {
  productId: string;
  /** The marketplace listing the product came from; old shop products have none. */
  submissionId?: string;
  /** The partner's mercadillo it belongs to: that partner gets the pencil too, into its own panel's editor. */
  partnerId?: string | null;
  className?: string;
}

/** On a listing page, the admin's small pencil beside the title, straight to its editor; a partner's on its own listings.
    Not floating: it must never cover the listing. */
const AdminEditButton = async ({ productId, submissionId, partnerId, className }: AdminEditButtonProps) => {
  const [isAdminUser, partner, { t }] = await Promise.all([isAdmin(), partnerId ? getSignedInPartner() : null, getT()]);
  const isOwnPartner = !isAdminUser && Boolean(submissionId && partnerId && partner?.id === partnerId);
  if (!isAdminUser && !isOwnPartner) return null;

  const href = isOwnPartner ? partnerListingPath(submissionId!) : submissionId ? `/admin/listings/${submissionId}` : `/admin/products/${productId}`;
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
