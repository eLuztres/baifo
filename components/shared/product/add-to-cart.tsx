'use client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Minus, Loader, ShoppingBag } from 'lucide-react';
import { Cart, CartItem } from '@/types';
import { useCartActions } from '@/hooks/useCartActions';
import { useI18n } from '@/components/i18n-provider';

interface AddToCartProps {
  cart?: Cart;
  item: CartItem;
}

const AddToCart = ({ cart, item }: AddToCartProps) => {
  const { isPending, addToCart, removeFromCart } = useCartActions();
  const { t } = useI18n();

  const existItem =
      cart && cart.items.find((x) => x.productId === item.productId);

  return existItem ? (
      <div className='flex items-center gap-3'>
        <div className='flex items-center rounded-full border'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='rounded-full'
            aria-label={t('REMOVE_ONE')}
            disabled={isPending}
            onClick={() => removeFromCart(item.productId)}
          >
            <Minus className='w-4 h-4' />
          </Button>
          <span className='w-8 text-center tabular-nums'>
            {isPending ? <Loader className='mx-auto w-4 h-4 animate-spin' /> : existItem.qty}
          </span>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='rounded-full'
            aria-label={t('ADD_ONE')}
            disabled={isPending}
            onClick={() => addToCart(item.productId)}
          >
            <Plus className='w-4 h-4' />
          </Button>
        </div>
        <Button asChild size='lg' className='flex-1 rounded-full'>
          <Link href='/cart'>
            <ShoppingBag /> {t('VIEW_CART')}
          </Link>
        </Button>
      </div>
  ) : (
      <Button
        size='lg'
        className='w-full rounded-full'
        type='button'
        disabled={isPending}
        onClick={() => addToCart(item.productId)}
      >
        {isPending ? (
            <Loader className='w-4 h-4 animate-spin' />
        ) : (
            <Plus className='w-4 h-4' />
        )}
        {t('ADD_TO_CART')}
      </Button>
  );
};

export default AddToCart;
