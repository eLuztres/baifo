import Link from 'next/link';
import { getSession, isCustomerView } from '@/lib/auth-guard';
import { signOutUser, toggleCustomerView } from '@/lib/actions/user.actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserIcon } from 'lucide-react';
import { getT } from '@/lib/i18n-server';
import type { Translator } from '@/lib/i18n-core';
import { ADMIN_HOME_PATH, SHOWCASE_MODE } from '@/lib/constants';

interface AccountLink {
  href: string;
  label: string;
}

/** The account pages, shared by this dropdown (desktop) and the phone menu (menu-account.tsx). */
export const getAccountLinks = (t: Translator, isAdmin: boolean): AccountLink[] => [
  { href: '/user/profile', label: t('USER_PROFILE') },
  ...(SHOWCASE_MODE ? [] : [{ href: '/user/orders', label: t('ORDER_HISTORY') }]),
  ...(isAdmin ? [{ href: ADMIN_HOME_PATH, label: t('ADMIN') }] : []),
];

export const getInitial = (name?: string | null) => name?.charAt(0).toUpperCase() ?? 'U';

const UserButton = async () => {
  const [session, { t }] = await Promise.all([getSession(), getT()]);

  if (!session) {
    return (
      <Button asChild variant='outline' className='rounded-full'>
        <Link href='/sign-in'>
          <UserIcon /> {t(SHOWCASE_MODE ? 'JOIN' : 'SIGN_IN')}
        </Link>
      </Button>
    );
  }

  const firstInitial = getInitial(session.user?.name);
  const isAdminUser = session.user?.role === 'admin';
  const isCustomer = await isCustomerView();

  return (
    <div className='flex gap-2 items-center'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='h-9 w-9 rounded-full bg-primary p-0 font-semibold text-primary-foreground hover:bg-primary/85 hover:text-primary-foreground'
            aria-label={t('ACCOUNT_MENU')}
          >
            {firstInitial}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end'>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <div className='text-sm font-medium leading-none'>
                {session.user?.name}
              </div>
              <div className='text-sm text-muted-foreground leading-none'>
                {session.user?.email}
              </div>
            </div>
          </DropdownMenuLabel>

          {/* asChild: Enter and Space click the item itself, so the link or button must be the item to be reached. */}
          {getAccountLinks(t, isAdminUser).map((link) => (
            <DropdownMenuItem asChild key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </DropdownMenuItem>
          ))}

          {isAdminUser && (
            <form action={toggleCustomerView}>
              <DropdownMenuItem asChild>
                <button type='submit' className='w-full'>
                  {t(isCustomer ? 'VIEW_AS_ADMIN' : 'VIEW_AS_CUSTOMER')}
                </button>
              </DropdownMenuItem>
            </form>
          )}

          <form action={signOutUser}>
            <DropdownMenuItem asChild>
              <button type='submit' className='w-full'>
                {t('SIGN_OUT')}
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserButton;
