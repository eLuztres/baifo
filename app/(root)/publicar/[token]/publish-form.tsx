'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, Loader2 } from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  captureListingPayPalOrder,
  confirmListing,
  createListingPayPalOrder,
  startStripeCheckout,
  type ListingChoice,
} from '@/lib/marketplace/checkout.actions';
import type { ListingPlan, PaymentMethod } from '@/lib/marketplace/config';
import { fill, type PublishPageTexts } from '@/lib/marketplace/page-texts';
import { CURRENCY } from '@/lib/constants/currency';
import { formatCurrency } from '@/lib/utils';

/** How the person can pay, as the server settings allow it. */
export interface PaymentOptions {
  methods: PaymentMethod[];
  bizumPhone?: string;
  /** The Bizum concept that tells the admin whose payment it is. */
  code: string;
  /** Where cash is handed over: the listing's Corral. */
  cashPlace: string;
}

interface PublishFormProps {
  token: string;
  texts: PublishPageTexts;
  prices: Record<ListingPlan, string>;
  days: number;
  /** What the person chose before, when they come back to the page. */
  initial: { plan: ListingPlan; isConfirmed: boolean };
  payment: PaymentOptions;
  paypalClientId: string;
}

const OPTION_CLASS = 'flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 has-[:checked]:border-primary';

export default function PublishForm({ token, texts, prices, days, initial, payment, paypalClientId }: PublishFormProps) {
  const router = useRouter();
  // The cheaper plan is preselected: most listings need nothing more.
  const [plan, setPlan] = useState<ListingPlan>(initial.plan);
  const [crossPostFacebook, setCrossPostFacebook] = useState(false);
  const [crossPostWallapop, setCrossPostWallapop] = useState(false);
  const [hasConsent, setHasConsent] = useState(initial.isConfirmed);
  const [isConfirmed, setIsConfirmed] = useState(initial.isConfirmed);
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

  const confirm = () => {
    const input = choice();
    if (!input) return;
    startTransition(async () => {
      const result = await confirmListing(input);
      if (result.success) setIsConfirmed(true);
      else setError(texts.error);
    });
  };

  const price = formatCurrency(prices[plan]);
  const isBizum = payment.methods.includes('bizum') && Boolean(payment.bizumPhone);
  const isCash = payment.methods.includes('cash');

  if (isConfirmed) {
    return (
      <div className='space-y-4 rounded-3xl border border-primary/30 bg-card p-5 sm:p-6'>
        <div className='space-y-1'>
          <h2 className='font-display text-xl'>{texts.payTitle}</h2>
          <p className='text-sm text-muted-foreground'>{texts.payIntro}</p>
        </div>
        {isBizum && (
          <div className='space-y-2 rounded-2xl bg-muted p-4'>
            <p className='font-semibold'>{fill(texts.payBizum, { price, phone: payment.bizumPhone ?? '' })}</p>
            <div className='flex flex-wrap items-center gap-2 text-sm'>
              <span className='text-muted-foreground'>{texts.payConcept}</span>
              <span className='font-mono text-base font-semibold tracking-wider'>{payment.code}</span>
              <CopyButton value={payment.code} texts={texts} />
            </div>
          </div>
        )}
        {isBizum && isCash && <p className='text-center text-sm text-muted-foreground'>{texts.or}</p>}
        {isCash && (
          <div className='rounded-2xl bg-muted p-4'>
            <p className='font-semibold'>
              {fill(texts.payCash, { place: payment.cashPlace })} · {price}
            </p>
          </div>
        )}
        {error && <p className='text-sm text-destructive'>{error}</p>}
        {payment.methods.includes('stripe') && (
          <Button onClick={payWithCard} disabled={isPending} className='h-12 w-full rounded-full text-base'>
            {isPending && <Loader2 className='animate-spin' />}
            {fill(texts.payStripe, { price })}
          </Button>
        )}
        {payment.methods.includes('paypal') && (
          <div className='space-y-2'>
            <p className='text-center text-sm text-muted-foreground'>{texts.payPaypal}</p>
            <PayPalScriptProvider options={{ clientId: paypalClientId, currency: CURRENCY }}>
              <PayPalButtons
                key={plan}
                style={{ layout: 'horizontal', tagline: false }}
                createOrder={createPayPalOrder}
                onApprove={approvePayPalOrder}
              />
            </PayPalScriptProvider>
          </div>
        )}
      </div>
    );
  }

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

      <div className='space-y-3 rounded-2xl bg-muted p-4'>
        <p className='font-medium'>{texts.consentTitle}</p>
        <p className='text-sm leading-6 text-muted-foreground'>
          {texts.consentNotice}{' '}
          <Link href='/privacy' target='_blank' className='underline underline-offset-2 hover:text-foreground'>
            {texts.privacyLink}
          </Link>
        </p>
        <Label className='flex items-start gap-3 font-normal leading-6'>
          <Checkbox checked={hasConsent} onCheckedChange={(value) => setHasConsent(value === true)} className='mt-1' />
          {texts.consent}
        </Label>
      </div>

      {error && <p className='text-sm text-destructive'>{error}</p>}

      <Button onClick={confirm} disabled={isPending} className='h-12 w-full rounded-full text-base'>
        {isPending && <Loader2 className='animate-spin' />}
        {texts.confirm}
      </Button>
    </div>
  );
}

interface CopyButtonProps {
  value: string;
  texts: PublishPageTexts;
}

function CopyButton({ value, texts }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const copy = async () => {
    // Clipboard access can be refused (old browsers, in-app browsers); the code stays readable anyway.
    await navigator.clipboard?.writeText(value).catch(() => {});
    setIsCopied(true);
  };
  return (
    <Button type='button' variant='outline' size='sm' className='h-8 rounded-full' onClick={copy}>
      {isCopied ? <Check /> : <Copy />} {isCopied ? texts.copied : texts.copy}
    </Button>
  );
}
