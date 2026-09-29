import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MenuIcon, ShoppingBag } from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import UserButton from './user-button';
import LanguageSwitcher from './language-switcher';
import { getMyCart } from '@/lib/actions/cart.actions';

type MenuProps = {
  navLinks?: { href: string; label: string }[];
  menuLabel?: string;
  cartLabel?: string;
};

const Menu = async ({
  navLinks = [
    { href: '/', label: 'Home' },
    { href: '/store', label: 'Shop' },
  ],
  menuLabel = 'Menu',
  cartLabel = 'Cart',
}: MenuProps) => {
  const cart = await getMyCart();
  const itemCount = cart?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0;

  return (
    <div className='flex items-center gap-2'>
      <Button
        asChild
        variant='ghost'
        size='icon'
        className='relative rounded-full'
      >
        <Link href='/cart' aria-label={`${cartLabel} (${itemCount})`}>
          <ShoppingBag className='!size-5' />
          {itemCount > 0 && (
            <span className='absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground'>
              {itemCount}
            </span>
          )}
        </Link>
      </Button>

      <div className='hidden lg:block'>
        <UserButton />
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='rounded-full lg:hidden'
            aria-label={menuLabel}
          >
            <MenuIcon className='!size-5' />
          </Button>
        </SheetTrigger>
        <SheetContent className='flex flex-col gap-6'>
          <SheetTitle className='font-display text-2xl'>{menuLabel}</SheetTitle>
          <nav className='flex flex-col gap-1'>
            {navLinks.map((link) => (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  className='rounded-lg px-3 py-3 text-lg text-foreground/80 transition hover:bg-muted hover:text-foreground'
                >
                  {link.label}
                </Link>
              </SheetClose>
            ))}
          </nav>
          <div className='mt-auto space-y-4 border-t pt-6'>
            <LanguageSwitcher />
            <UserButton />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Menu;
