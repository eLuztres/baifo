'use client';

import { type ReactNode, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Check, CheckCircle2, Copy, Loader2, MapPin, MessageCircle, Smartphone } from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  captureListingPayPalOrder,
  claimListingPayment,
  confirmListing,
  createListingPayPalOrder,
  startStripeCheckout,
  type ListingChoice,
} from '@/lib/marketplace/checkout.actions';
import type { ListingPlan, PaymentMethod } from '@/lib/marketplace/config';
import { fill, type PublishPageTexts } from '@/lib/marketplace/page-texts';
import { CURRENCY } from '@/lib/constants/currency';
import { cn, formatCurrency } from '@/lib/utils';

/** How the person can pay, as the server settings allow it. */
export interface PaymentOptions {
  methods: PaymentMethod[];
  bizumPhone?: string;
  /** The Bizum concept that tells the admin whose payment it is. */
  code: string;
  /** Where cash is handed over: the listing's Corral, if its place has one. */
  corral?: PayCorral | null;
  /** When the private link stops working, in the person's language and the shop's time. */
  validUntil: string;
  /** The shop's own WhatsApp for questions; never the person's. */
  helpUrl?: string;
}

interface PayCorral {
  name: string;
  address: string;
  hours: string;
  mapsUrl: string;
}

type ManualPayMethod = 'bizum' | 'cash';

interface PublishFormProps {
  token: string;
  texts: PublishPageTexts;
  prices: Record<ListingPlan, string>;
  days: number;
  /** What the person chose before, when they come back to the page. */
  initial: { isConfirmed: boolean; claimedMethod: ManualPayMethod | null };
  payment: PaymentOptions;
  paypalClientId: string;
  /** The way back into the shop, shown once the person has chosen how to pay. */
  shopTeaser: ReactNode;
  /** Paying again for a listing that was online: no steps to show, it was confirmed long ago. */
  isRenewal?: boolean;
  /** false: the fee was paid before the listing was made, so the OK is the last step and no money shows. */
  hasPayment?: boolean;
}

const OPTION_CLASS = 'flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 has-[:checked]:border-primary';

export default function PublishForm({ token, texts, prices, days, initial, payment, paypalClientId, shopTeaser, isRenewal = false, hasPayment = true }: PublishFormProps) {
  const router = useRouter();
  // Premium is shown but not offered yet, so the plan is always the normal one.
  const plan: ListingPlan = 'normal';
  const [hasConsent, setHasConsent] = useState(initial.isConfirmed);
  const [isConfirmed, setIsConfirmed] = useState(initial.isConfirmed);
  // Bizum and cash are paid outside the page; with only one of them there is nothing to choose.
  const manualMethods = payment.methods.filter((option): option is ManualPayMethod => option === 'bizum' || option === 'cash');
  const [method, setMethod] = useState<ManualPayMethod | null>(manualMethods.length === 1 ? manualMethods[0] : null);
  const [claimedMethod, setClaimedMethod] = useState(initial.claimedMethod);
  const [isLater, setIsLater] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const choice = (): ListingChoice | null => {
    if (!hasConsent) {
      setError(texts.consentRequired);
      return null;
    }
    setError('');
    return { token, plan, hasContactConsent: true };
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

  const claim = (claimed: ManualPayMethod) =>
    startTransition(async () => {
      setError('');
      const result = await claimListingPayment(token, claimed);
      if (result.success) setClaimedMethod(claimed);
      else setError(texts.error);
    });

  const price = formatCurrency(prices[plan]);
  // As typed into Bizum: "5" or "7,50".
  const amount = String(Number(prices[plan])).replace('.', ',');

  if (claimedMethod || (isConfirmed && !hasPayment)) {
    return (
      <div className='space-y-6'>
        <div className='space-y-2 rounded-3xl border border-primary/30 bg-card p-5 sm:p-6'>
          <h2 className='flex items-center gap-2 font-display text-2xl'>
            <CheckCircle2 className='size-6 shrink-0 text-primary' aria-hidden /> {texts.doneTitle}
          </h2>
          <p>{hasPayment ? texts.doneText : texts.readyText}</p>
          <p className='text-sm text-muted-foreground'>
            {hasPayment && (claimedMethod === 'cash' ? fill(texts.doneNextCash, { date: payment.validUntil }) : texts.doneNextBizum)} {texts.doneComeBack}
          </p>
          {payment.helpUrl && (
            <a href={payment.helpUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline'>
              <MessageCircle className='size-4' aria-hidden /> {texts.askUs}
            </a>
          )}
        </div>
        {shopTeaser}
      </div>
    );
  }

  if (isConfirmed && isLater) {
    return (
      <div className='space-y-6'>
        <div className='space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6'>
          {!isRenewal && <PayProgress texts={texts} />}
          <div className='space-y-1'>
            <h2 className='font-display text-xl'>{texts.laterTitle}</h2>
            <p className='text-sm text-muted-foreground'>{fill(texts.laterText, { date: payment.validUntil })}</p>
          </div>
          <PayExits texts={texts} helpUrl={payment.helpUrl} />
          <Button variant='ghost' className='w-full rounded-full' onClick={() => setIsLater(false)}>
            {texts.backToPay}
          </Button>
        </div>
        {shopTeaser}
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className='space-y-5 rounded-3xl border border-primary/30 bg-card p-4 sm:p-6'>
        {!isRenewal && <PayProgress texts={texts} />}
        <div className='space-y-1'>
          <h2 className='font-display text-xl'>{texts.payTitle}</h2>
          <p className='text-sm text-muted-foreground'>{texts.payIntro}</p>
        </div>
        {manualMethods.length > 0 && (
          <div role='radiogroup' aria-label={texts.payTitle} className={cn('grid gap-2', manualMethods.length > 1 && 'min-[360px]:grid-cols-2')}>
            {manualMethods.map((option) => (
              <button
                key={option}
                type='button'
                role='radio'
                aria-checked={method === option}
                onClick={() => setMethod(option)}
                className={cn(
                  'flex min-w-0 flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition',
                  method === option ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                )}
              >
                <span className='inline-flex items-center gap-1.5 font-semibold'>
                  {option === 'bizum' ? <Smartphone className='size-4 shrink-0 text-primary' aria-hidden /> : <Banknote className='size-4 shrink-0 text-primary' aria-hidden />}
                  {option === 'bizum' ? texts.payChooseBizum : texts.payChooseCash}
                </span>
                <span className='text-xs text-muted-foreground'>{option === 'bizum' ? texts.payChooseBizumHint : texts.payChooseCashHint}</span>
              </button>
            ))}
          </div>
        )}
        {method === 'bizum' && (
          <div className='space-y-3 rounded-2xl bg-muted p-4'>
            <p className='text-sm'>{texts.payBizumHow}</p>
            <CopyRow label={texts.payAmount} value={price} copyValue={amount} texts={texts} />
            {/* Non-breaking spaces: the number must stay on one line to be read and typed in. */}
            <CopyRow label={texts.payPhone} value={(payment.bizumPhone ?? '').replace(/ /g, '\u00a0')} copyValue={(payment.bizumPhone ?? '').replace(/\D/g, '')} texts={texts} />
            <CopyRow label={texts.payConcept} value={payment.code} texts={texts} isCode />
          </div>
        )}
        {method === 'cash' && (
          <div className='space-y-3 rounded-2xl bg-muted p-4 text-sm'>
            <p>{texts.payCashHow}</p>
            <div className='min-w-0'>
              <p className='text-xs text-muted-foreground'>{texts.payWhere}</p>
              <p className='font-semibold'>{payment.corral?.name ?? texts.corral}</p>
              {payment.corral && (
                <a
                  href={payment.corral.mapsUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex max-w-full items-start gap-1 break-words text-primary underline underline-offset-2'
                >
                  <MapPin className='mt-0.5 size-4 shrink-0' aria-hidden />
                  <span className='min-w-0'>{payment.corral.address}</span>
                </a>
              )}
            </div>
            {payment.corral?.hours && (
              <div>
                <p className='text-xs text-muted-foreground'>{texts.payHours}</p>
                <p className='whitespace-pre-line'>{payment.corral.hours}</p>
              </div>
            )}
            <div className='flex flex-wrap gap-x-6 gap-y-3'>
              <div>
                <p className='text-xs text-muted-foreground'>{texts.payAmount}</p>
                <p className='text-base font-semibold'>{price}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>{texts.payCode}</p>
                <p className='font-mono text-base font-semibold tracking-wider'>{payment.code}</p>
              </div>
            </div>
          </div>
        )}
        {error && <p className='text-sm text-destructive'>{error}</p>}
        {method && (
          <Button onClick={() => claim(method)} disabled={isPending} className='h-14 w-full rounded-full text-base'>
            {isPending ? <Loader2 className='animate-spin' /> : <Check />}
            {method === 'bizum' ? texts.payBizumDone : texts.payCashDone}
          </Button>
        )}
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
        <Button variant='ghost' className='w-full rounded-full text-muted-foreground' onClick={() => setIsLater(true)}>
          {texts.payLater}
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {hasPayment && (
        <fieldset className='space-y-3'>
          <legend className='mb-3 font-display text-xl'>{texts.planTitle}</legend>
          <RadioGroup value={plan} className='grid gap-3 sm:grid-cols-2'>
            {(['normal', 'big'] as const).map((option) => (
              <Label key={option} className={cn(OPTION_CLASS, option === 'big' && 'cursor-not-allowed bg-muted text-muted-foreground')}>
                <RadioGroupItem value={option} disabled={option === 'big'} className='mt-1' />
                <span className='space-y-1'>
                  <span className='block text-base font-semibold'>
                    {option === 'big' ? texts.planBig : texts.planNormal} · {formatCurrency(prices[option])}
                    {option === 'big' && <ComingSoon texts={texts} />}
                  </span>
                  <span className='block text-sm font-normal text-muted-foreground'>
                    {fill(option === 'big' ? texts.planBigText : texts.planNormalText, { days })}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
      )}

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

      <Button onClick={confirm} disabled={isPending || !hasConsent} className='h-12 w-full rounded-full text-base'>
        {isPending && <Loader2 className='animate-spin' />}
        {texts.confirm}
      </Button>
    </div>
  );
}

interface ComingSoonProps {
  texts: PublishPageTexts;
}

/** Marks a plan or extra that is shown but can't be chosen yet. */
function ComingSoon({ texts }: ComingSoonProps) {
  return <span className='ml-2 inline-block rounded-full border border-border px-2 py-0.5 align-middle text-xs font-medium'>{texts.comingSoon}</span>;
}

interface PayStepProps {
  texts: PublishPageTexts;
}

/** Goal gradient: two steps done, only the payment left. */
function PayProgress({ texts }: PayStepProps) {
  return (
    <ol className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
      {[texts.stepListing, texts.stepConsent].map((step) => (
        <li key={step} className='inline-flex items-center gap-1'>
          <Check className='size-3.5 text-primary' aria-hidden /> {step}
        </li>
      ))}
      <li className='inline-flex items-center gap-1 font-medium text-foreground' aria-current='step'>
        <span className='flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground'>3</span> {texts.stepPay}
      </li>
    </ol>
  );
}

interface PayExitsProps extends PayStepProps {
  helpUrl?: string;
}

/** A calm way out of the private page: the shop, or a question to the shop's own WhatsApp. */
function PayExits({ texts, helpUrl }: PayExitsProps) {
  return (
    <div className='grid gap-2 sm:grid-cols-2'>
      <Button asChild variant='outline' className='h-12 rounded-full'>
        <Link href='/'>{texts.viewShop}</Link>
      </Button>
      {helpUrl && (
        <Button asChild variant='outline' className='h-12 rounded-full'>
          <a href={helpUrl} target='_blank' rel='noopener noreferrer'>
            <MessageCircle /> {texts.askUs}
          </a>
        </Button>
      )}
    </div>
  );
}

interface CopyRowProps extends PayStepProps {
  label: string;
  value: string;
  /** What lands on the clipboard, when it differs from what is shown. */
  copyValue?: string;
  isCode?: boolean;
}

function CopyRow({ label, value, copyValue, isCode = false, texts }: CopyRowProps) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
      <div className='min-w-0'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className={cn('break-words text-base font-semibold', isCode && 'font-mono tracking-wider')}>{value}</p>
      </div>
      <CopyButton value={copyValue ?? value} texts={texts} />
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
