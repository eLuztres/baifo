import { redirect } from 'next/navigation';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getUserById } from '@/lib/actions/user.actions';
import { requireUser } from '@/lib/auth-guard';
import { shippingAddressDefaultValues } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { ShippingAddress } from '@/types';
import CheckoutSteps from '@/components/shared/checkout-steps';
import ShippingAddressForm from './shipping-address-form';

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t('CHECKOUT_SHIPPING_ADDRESS') };
}

const ShippingAddressPage = async () => {
  const session = await requireUser();
  const [cart, user] = await Promise.all([getMyCart(), getUserById(session.user.id)]);

  if (!cart || cart.items.length === 0) redirect('/cart');
  if (!user) redirect('/sign-in');

  return (
    <>
      <CheckoutSteps current={1} />
      <ShippingAddressForm address={(user.address as ShippingAddress | null) ?? shippingAddressDefaultValues} />
    </>
  );
};

export default ShippingAddressPage;
