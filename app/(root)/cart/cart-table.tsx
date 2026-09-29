'use client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { addItemToCart, removeItemFromCart } from '@/lib/actions/cart.actions';
import { ArrowRight, Loader, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Cart, CartItem } from '@/types';
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
import { useI18n } from '@/components/i18n-provider';

// NOTE: The code here has changed from the original course code so that the
// Buttons no longer share the same state and show the loader independently from
// other items in the cart

function AddButton({ item }: { item: CartItem }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      disabled={isPending}
      variant='outline'
      size='icon'
      className='h-8 w-8 rounded-full'
      type='button'
      aria-label={t('ADD_ONE')}
      onClick={() =>
        startTransition(async () => {
          const res = await addItemToCart(item);

          if (!res.success) {
            toast({
              variant: 'destructive',
              description:
                res.message === 'Not enough stock' ? t('TOAST_NO_STOCK') : res.message,
            });
          }
        })
      }
    >
      {isPending ? (
        <Loader className='w-4 h-4 animate-spin' />
      ) : (
        <Plus className='w-4 h-4' />
      )}
    </Button>
  );
}

function RemoveButton({ item }: { item: CartItem }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      disabled={isPending}
      variant='outline'
      size='icon'
      className='h-8 w-8 rounded-full'
      type='button'
      aria-label={t('REMOVE_ONE')}
      onClick={() =>
        startTransition(async () => {
          const res = await removeItemFromCart(item.productId);

          if (!res.success) {
            toast({
              variant: 'destructive',
              description:
                res.message === 'Not enough stock' ? t('TOAST_NO_STOCK') : res.message,
            });
          }
        })
      }
    >
      {isPending ? (
        <Loader className='w-4 h-4 animate-spin' />
      ) : (
        <Minus className='w-4 h-4' />
      )}
    </Button>
  );
}

const CartTable = ({ cart }: { cart?: Cart }) => {
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
            <Link href='/store'>{t('CART_EMPTY_CTA')}</Link>
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
                        <RemoveButton item={item} />
                        <span className='w-6 text-center tabular-nums'>{item.qty}</span>
                        <AddButton item={item} />
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
