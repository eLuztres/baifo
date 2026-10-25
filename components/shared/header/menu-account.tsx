import Link from 'next/link';
import { LogOut, UserIcon } from 'lucide-react';
import { getSession } from '@/lib/auth-guard';
import { signOutUser } from '@/lib/actions/user.actions';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import { SHOWCASE_MODE } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { getAccountLinks, getInitial } from './user-button';

// The menu's rows: page links (menu.tsx) and account links look the same.
export const MENU_ROW_CLASS = 'rounded-lg px-3 py-3 text-lg text-foreground/80 transition hover:bg-muted hover:text-foreground';

/** The account part of the phone menu: who is signed in and every account link, without a second dropdown. */
const MenuAccount = async () => {
  const [session, { t }] = await Promise.all([getSession(), getT()]);
  const isAdminUser = session?.user?.role === 'admin';

  if (!session?.user) {
    return (
      <SheetClose asChild>
        <Button asChild variant='outline' size='lg' className='w-full rounded-full'>
          <Link href='/sign-in'>
            <UserIcon /> {t(SHOWCASE_MODE ? 'JOIN' : 'SIGN_IN')}
          </Link>
        </Button>
      </SheetClose>
    );
  }

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-center gap-3 px-3 pb-2'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground'>
          {getInitial(session.user.name)}
        </span>
        <div className='min-w-0'>
          <p className='truncate font-medium'>{session.user.name}</p>
          <p className='truncate text-sm text-muted-foreground'>{session.user.email}</p>
        </div>
      </div>
      {getAccountLinks(t, isAdminUser).map((link) => (
        <SheetClose asChild key={link.href}>
          <Link href={link.href} className={MENU_ROW_CLASS}>
            {link.label}
          </Link>
        </SheetClose>
      ))}
      <form action={signOutUser}>
        <SheetClose asChild>
          <button type='submit' className={cn(MENU_ROW_CLASS, 'flex w-full items-center gap-3 text-left text-muted-foreground')}>
            <LogOut className='size-5' />
            {t('SIGN_OUT')}
          </button>
        </SheetClose>
      </form>
    </div>
  );
};

export default MenuAccount;
