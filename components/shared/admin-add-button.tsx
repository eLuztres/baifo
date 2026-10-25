import Link from 'next/link';
import { HandHelping, Package, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { isAdmin } from '@/lib/auth-guard';
import { NEW_PRODUCT_PATH, NEW_SERVICE_PATH } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

/** The admin's only tool on the shop: a floating "+" that opens upwards to a new product or a new service. */
const AdminAddButton = async () => {
  const [isAdminUser, { t }] = await Promise.all([isAdmin(), getT()]);
  if (!isAdminUser) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('ADMIN_ADD')}
        title={t('ADMIN_ADD')}
        className='fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 hover:bg-primary/90 data-[state=open]:rotate-45 sm:right-6 sm:bottom-6'
      >
        <Plus className='size-7' />
      </DropdownMenuTrigger>
      <DropdownMenuContent side='top' align='end' sideOffset={12} className='min-w-48'>
        <DropdownMenuItem asChild className='gap-3 py-2.5 text-base'>
          <Link href={NEW_PRODUCT_PATH}>
            <Package className='size-5' /> {t('ADMIN_NEW_PRODUCT')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className='gap-3 py-2.5 text-base'>
          <Link href={NEW_SERVICE_PATH}>
            <HandHelping className='size-5' /> {t('ADMIN_NEW_SERVICE')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminAddButton;
