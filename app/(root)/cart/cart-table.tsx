'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ArrowRight, Loader, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Cart } from '@/types';
import Link from 'next/link';
import ProductMedia from '@/components/ProductMedia';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { SECTION_IDS, sectionHref } from '@/components/shared/home/one-page';
import { useI18n } from '@/components/i18n-provider';
import { useCartActions } from '@/hooks/useCartActions';

interface QuantityButtonProps {
  productId: string;
  action: 'add' | 'remove';
}

// One hook per button, so only the clicked button shows the loader.
function QuantityButton({ productId, action }: QuantityButtonProps) {
  const { t } = useI18n();
  const { isPending, addToCart, removeFromCart } = useCartActions({ shouldToastSuccess: false });
  const isAdd = action === 'add';
  const Icon = isAdd ? Plus : Minus;

  return (
    <Button
      disabled={isPending}
      variant='outline'
      size='icon'
      className='h-8 w-8 rounded-full'
      type='button'
      aria-label={t(isAdd ? 'ADD_ONE' : 'REMOVE_ONE')}
      onClick={() => (isAdd ? addToCart(productId) : removeFromCart(productId))}
    >
      {isPending ? (
        <Loader className='w-4 h-4 animate-spin' />
      ) : (
        <Icon className='w-4 h-4' />
      )}
    </Button>
  );
}

interface CartTableProps {
  cart?: Cart;
}

const CartTable = ({ cart }: CartTableProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { t } = useI18n();

  return (
    <>
      <h1 className='mb-8 text-4xl sm:text-5xl'>{t('CART_TITLE')}</h1>
      {!cart || cart.items.length === 0 ? (
        <div className='flex flex-col items-center gap-5 rounded-3xl border border-dashed border-border px-6 py-20 text-center'>
          <ShoppingBag className='h-10 w-10 text-muted-foreground' strokeWidth={1.25} />
          <div className='space-y-2'>
            <p className='text-xl'>{t('CART_EMPTY_TITLE')}</p>
            <p className='text-sm text-muted-foreground'>
              {t('CART_EMPTY_TEXT')}
            </p>
          </div>
          <Button asChild className='rounded-full px-7'>
            <Link href={sectionHref(SECTION_IDS.showroom)}>{t('CART_EMPTY_CTA')}</Link>
          </Button>
        </div>
      ) : (
        <div className='grid gap-6 md:grid-cols-4'>
          <div className='overflow-x-auto rounded-2xl border border-border bg-card md:col-span-3'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('CART_ITEM')}</TableHead>
                  <TableHead className='text-center'>{t('CART_QUANTITY')}</TableHead>
                  <TableHead className='text-right'>{t('CART_PRICE')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.items.map((item) => (
                  <TableRow key={item.slug}>
                    <TableCell>
                      <Link
                        href={`/product/${item.slug}`}
                        className='flex items-center gap-4'
                      >
                        <span className='relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted'>
                          <ProductMedia src={item.image} alt={item.name} fill sizes='64px' />
                        </span>
                        <span className='font-medium'>{item.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center justify-center gap-2'>
                        <QuantityButton productId={item.productId} action='remove' />
                        <span className='w-6 text-center tabular-nums'>{item.qty}</span>
                        <QuantityButton productId={item.productId} action='add' />
                      </div>
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {formatCurrency(item.price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Card className='h-fit rounded-2xl border-border'>
            <CardContent className='space-y-4 p-6'>
              <div className='flex items-baseline justify-between'>
                <span className='text-muted-foreground'>
                  {t('CART_SUBTOTAL', { count: cart.items.reduce((a, c) => a + c.qty, 0) })}
                </span>
                <span className='text-xl font-semibold tabular-nums'>
                  {formatCurrency(cart.itemsPrice)}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                {t('CART_SHIPPING_NOTE')}
              </p>
              <Button
                size='lg'
                className='w-full rounded-full'
                disabled={isPending}
                onClick={() =>
                  startTransition(() => router.push('/shipping-address'))
                }
              >
                {isPending ? (
                  <Loader className='w-4 h-4 animate-spin' />
                ) : (
                  <ArrowRight className='w-4 h-4' />
                )}{' '}
                {t('CART_CHECKOUT')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default CartTable;
