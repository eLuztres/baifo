import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getUserById } from '@/lib/actions/user.actions';
import { requireUser } from '@/lib/auth-guard';
import { PAYMENT_METHODS } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { paymentMethodLabel } from '@/lib/utils';
import { ShippingAddress } from '@/types';
import CheckoutSteps from '@/components/shared/checkout-steps';
import OrderInfoCard from '@/components/shared/order/order-info-card';
import OrderItemsTable from '@/components/shared/order/order-items-table';
import OrderSummary from '@/components/shared/order/order-summary';
import ShippingAddressDetails from '@/components/shared/order/shipping-address-details';
import { Button } from '@/components/ui/button';
import PlaceOrderForm from './place-order-form';

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t('CHECKOUT_PLACE_ORDER') };
}

const PlaceOrderPage = async () => {
  const session = await requireUser();
  const [cart, user, { t }] = await Promise.all([getMyCart(), getUserById(session.user.id), getT()]);

  if (!cart || cart.items.length === 0) redirect('/cart');
  if (!user) redirect('/sign-in');
  if (!user.address) redirect('/shipping-address');
  // A method the shop no longer offers would only fail when the order is placed.
  if (!user.paymentMethod || !PAYMENT_METHODS.includes(user.paymentMethod)) redirect('/payment-method');

  return (
    <>
      <CheckoutSteps current={3} />
      <h1 className='py-4 text-2xl'>{t('CHECKOUT_PLACE_ORDER')}</h1>
      <div className='grid gap-4 md:grid-cols-3 md:gap-5'>
        <div className='md:col-span-2 overflow-x-auto space-y-4'>
          <OrderInfoCard title={t('CHECKOUT_SHIPPING_ADDRESS')}>
            <ShippingAddressDetails address={user.address as ShippingAddress} />
            <div className='mt-3'>
              <Button asChild variant='outline'>
                <Link href='/shipping-address'>{t('CHECKOUT_EDIT')}</Link>
              </Button>
            </div>
          </OrderInfoCard>

          <OrderInfoCard title={t('CHECKOUT_PAYMENT_METHOD')}>
            <p>{paymentMethodLabel(t, user.paymentMethod)}</p>
            <div className='mt-3'>
              <Button asChild variant='outline'>
                <Link href='/payment-method'>{t('CHECKOUT_EDIT')}</Link>
              </Button>
            </div>
          </OrderInfoCard>

          <OrderItemsTable items={cart.items} />
        </div>
        <OrderSummary prices={cart}>
          <PlaceOrderForm />
        </OrderSummary>
      </div>
    </>
  );
};

export default PlaceOrderPage;
