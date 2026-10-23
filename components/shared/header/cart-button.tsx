import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCartItemCount } from '@/lib/actions/cart.actions';

interface CartLinkProps {
  label: string;
  /** Unknown while the cart loads: the bag then shows without a count. */
  itemCount?: number;
}

export const CartLink = ({ label, itemCount }: CartLinkProps) => (
  <Button asChild variant='ghost' size='icon' className='relative rounded-full'>
    <Link href='/cart' aria-label={itemCount === undefined ? label : `${label} (${itemCount})`}>
      <ShoppingBag className='!size-5' />
      {itemCount !== undefined && itemCount > 0 && (
        <span className='absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground'>
          {itemCount}
        </span>
      )}
    </Link>
  </Button>
);

interface CartButtonProps {
  label: string;
}

/** The cart link with its item count; render it inside <Suspense> so the header doesn't wait for the cart. */
const CartButton = async ({ label }: CartButtonProps) => {
  const itemCount = await getCartItemCount();

  return <CartLink label={label} itemCount={itemCount} />;
};

export default CartButton;
