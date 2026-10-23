'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  captureListingPayPalOrder,
  createListingPayPalOrder,
  startStripeCheckout,
  type ListingChoice,
} from '@/lib/marketplace/checkout.actions';
import type { ListingPlan } from '@/lib/marketplace/config';
import { fill, type PublishPageTexts } from '@/lib/marketplace/page-texts';
import { CURRENCY } from '@/lib/constants/currency';
import { formatCurrency } from '@/lib/utils';

interface PublishFormProps {
  token: string;
  texts: PublishPageTexts;
  prices: Record<ListingPlan, string>;
  days: number;
  paypalClientId: string;
}

const OPTION_CLASS = 'flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 has-[:checked]:border-primary';

export default function PublishForm({ token, texts, prices, days, paypalClientId }: PublishFormProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<ListingPlan>('normal');
  const [crossPostFacebook, setCrossPostFacebook] = useState(false);
  const [crossPostWallapop, setCrossPostWallapop] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const choice = (): ListingChoice | null => {
    if (!hasConsent) {
      setError(texts.consentRequired);
      return null;
    }
    setError('');
    return { token, plan, crossPostFacebook, crossPostWallapop, hasContactConsent: true };
  };

  const payWithCard = () => {
    const input = choice();
    if (!input) return;
    startTransition(async () => {
      const result = await startStripeCheckout(input);
      if (result.url) window.location.assign(result.url);
      else setError(texts.error);
    });
  };

  const createPayPalOrder = async () => {
    const input = choice();
    const result = input ? await createListingPayPalOrder(input) : null;
    if (!result?.orderId) {
      if (input) setError(texts.error);
      // Throwing closes the PayPal window instead of leaving it waiting.
      throw new Error('No PayPal order');
    }
    return result.orderId;
  };

  const approvePayPalOrder = async ({ orderID }: { orderID: string }) => {
    const result = await captureListingPayPalOrder(token, orderID);
    if (result.success) router.push(`?pagado=1`);
    else setError(texts.error);
  };

  return (
    <div className='space-y-6'>
      <fieldset className='space-y-3'>
        <legend className='mb-3 font-display text-xl'>{texts.planTitle}</legend>
        <RadioGroup value={plan} onValueChange={(value) => setPlan(value as ListingPlan)} className='grid gap-3 sm:grid-cols-2'>
          {(['normal', 'big'] as const).map((option) => (
            <Label key={option} className={OPTION_CLASS}>
              <RadioGroupItem value={option} className='mt-1' />
              <span className='space-y-1'>
                <span className='block text-base font-semibold'>
                  {option === 'big' ? texts.planBig : texts.planNormal} · {formatCurrency(prices[option])}
                </span>
                <span className='block text-sm font-normal text-muted-foreground'>
                  {fill(option === 'big' ? texts.planBigText : texts.planNormalText, { days })}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset className='space-y-3'>
        <legend className='mb-3 font-display text-xl'>{texts.extrasTitle}</legend>
        <Label className='flex items-center gap-3 font-normal'>
          <Checkbox checked={crossPostFacebook} onCheckedChange={(value) => setCrossPostFacebook(value === true)} />
          {texts.extraFacebook}
        </Label>
        <Label className='flex items-center gap-3 font-normal'>
          <Checkbox checked={crossPostWallapop} onCheckedChange={(value) => setCrossPostWallapop(value === true)} />
          {texts.extraWallapop}
        </Label>
      </fieldset>

      <Label className='flex items-start gap-3 rounded-2xl bg-muted p-4 font-normal leading-6'>
        <Checkbox checked={hasConsent} onCheckedChange={(value) => setHasConsent(value === true)} className='mt-1' />
        {texts.consent}
      </Label>

      {error && <p className='text-sm text-destructive'>{error}</p>}

      <Button onClick={payWithCard} disabled={isPending} className='h-12 w-full rounded-full text-base'>
        {isPending && <Loader2 className='animate-spin' />}
        {fill(texts.payStripe, { price: formatCurrency(prices[plan]) })}
      </Button>

      <div className='space-y-2'>
        <p className='text-center text-sm text-muted-foreground'>{texts.payPaypal}</p>
        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: CURRENCY }}>
          {/* The key re-creates the buttons when the choice changes, so PayPal gets the current price. */}
          <PayPalButtons
            key={`${plan}-${hasConsent}`}
            style={{ layout: 'horizontal', tagline: false }}
            createOrder={createPayPalOrder}
            onApprove={approvePayPalOrder}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  );
}
