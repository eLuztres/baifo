'use client';

import { FormEvent, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { formatCurrency } from '@/lib/utils';

// Once per page load: a new promise on every render makes Elements remount the payment form.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

interface StripeFormProps {
  orderId: string;
  totalPrice: string;
}

function StripeForm({ orderId, totalPrice }: StripeFormProps) {
  const { t } = useI18n();
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      // The current origin, so a preview deployment comes back to itself and not to production.
      confirmParams: { return_url: `${window.location.origin}/order/${orderId}/stripe-payment-success` },
    });
    // On success Stripe leaves for return_url. Card and validation messages are meant
    // for the buyer and come in the Elements locale; anything else gets a generic text.
    if (error) {
      const isBuyerMessage = error.type === 'card_error' || error.type === 'validation_error';
      setErrorMessage(isBuyerMessage && error.message ? error.message : t('ORDER_STRIPE_ERROR'));
    }
    setIsLoading(false);
  };

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      <div className='text-xl'>{t('ORDER_STRIPE_TITLE')}</div>
      {errorMessage && <div className='text-destructive'>{errorMessage}</div>}
      <PaymentElement />
      <div>
        <LinkAuthenticationElement />
      </div>
      <Button className='w-full' size='lg' disabled={!stripe || !elements || isLoading}>
        {isLoading ? t('ORDER_STRIPE_PAYING') : t('ORDER_STRIPE_PAY', { amount: formatCurrency(totalPrice) })}
      </Button>
    </form>
  );
}

interface StripePaymentProps extends StripeFormProps {
  clientSecret: string;
}

const StripePayment = ({ orderId, clientSecret, totalPrice }: StripePaymentProps) => {
  const { locale } = useI18n();
  const { resolvedTheme } = useTheme();

  return (
    <Elements
      options={{
        clientSecret,
        locale,
        appearance: { theme: resolvedTheme === 'light' ? 'stripe' : 'night' },
      }}
      stripe={stripePromise}
    >
      <StripeForm orderId={orderId} totalPrice={totalPrice} />
    </Elements>
  );
};

export default StripePayment;
