import { redirect } from 'next/navigation';
import { getUserById } from '@/lib/actions/user.actions';
import { requireUser } from '@/lib/auth-guard';
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import CheckoutSteps from '@/components/shared/checkout-steps';
import PaymentMethodForm from './payment-method-form';

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t('CHECKOUT_PAYMENT_METHOD') };
}

const PaymentMethodPage = async () => {
  const session = await requireUser();
  const user = await getUserById(session.user.id);
  if (!user) redirect('/sign-in');

  // A saved method the shop no longer offers isn't preselected.
  const preferredPaymentMethod =
    user.paymentMethod && PAYMENT_METHODS.includes(user.paymentMethod) ? user.paymentMethod : null;

  return (
    <>
      <CheckoutSteps current={2} />
      <PaymentMethodForm
        preferredPaymentMethod={preferredPaymentMethod}
        paymentMethods={PAYMENT_METHODS}
        defaultPaymentMethod={DEFAULT_PAYMENT_METHOD}
      />
    </>
  );
};

export default PaymentMethodPage;
