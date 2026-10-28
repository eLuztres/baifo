'use client';

import { useState } from 'react';
import { BadgeCheck, Banknote, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { AdminListing } from '@/lib/marketplace/admin.actions';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import type { ListingPlan } from '@/lib/marketplace/config';
import { formatCurrency } from '@/lib/utils';

export type AdminPayMethod = 'bizum' | 'cash';

interface PaymentPanelProps {
  listing: AdminListing;
  plan: ListingPlan;
  /** Whether the listing carries the person's number, which needs their OK to go online. */
  hasPersonNumber: boolean;
  texts: AdminTexts;
  isPending: boolean;
  onConsent: () => void;
  onPaid: (method: AdminPayMethod, amount: string) => void;
}

const dateOf = (date: Date | string) =>
  new Date(date).toLocaleString('es-ES', { timeZone: 'Atlantic/Canary', dateStyle: 'short', timeStyle: 'short' });

/** For a listing sent to its person: their consent, what they should pay and the "Pagado" button. */
export default function PaymentPanel({ listing, plan, hasPersonNumber, texts, isPending, onConsent, onPaid }: PaymentPanelProps) {
  const [method, setMethod] = useState<AdminPayMethod>('bizum');
  // Null until typed: the chosen plan's price, which follows a change of plan.
  const [amount, setAmount] = useState<string | null>(null);
  const planPrice = listing.planPrices[plan];
  const isLocked = hasPersonNumber && !listing.consentAt;
  const isWaiting = listing.status === 'AWAITING_PAYMENT';

  return (
    <div className='space-y-3 rounded-3xl border border-border bg-card p-4'>
      {hasPersonNumber &&
        (listing.consentAt ? (
          <p className='flex items-start gap-2 text-sm'>
            <BadgeCheck className='mt-0.5 size-4 shrink-0 text-primary' aria-hidden />
            {fillText(texts.consentGiven, {
              date: dateOf(listing.consentAt),
              source: listing.consentSource === 'whatsapp-reply' ? texts.consentFromWhatsApp : texts.consentFromPage,
            })}
          </p>
        ) : (
          <div className='space-y-2'>
            <p className='text-sm text-muted-foreground'>{texts.consentMissing}</p>
            <Label className='flex items-start gap-3 font-normal leading-5'>
              <Checkbox checked={false} disabled={isPending} onCheckedChange={(value) => value === true && onConsent()} className='mt-0.5' />
              {texts.consentByWhatsApp}
            </Label>
          </div>
        ))}

      {isWaiting && (
        <div className='space-y-3 border-t border-border pt-3 first:border-t-0 first:pt-0'>
          <p className='text-sm font-medium'>
            {texts.payTitle} ·{' '}
            {fillText(texts.payExpected, { amount: formatCurrency(planPrice), code: listing.payCode ?? '–' })}
          </p>
          <div className='flex flex-wrap items-end gap-4'>
            <RadioGroup value={method} onValueChange={(value) => setMethod(value as AdminPayMethod)} className='flex gap-4'>
              {(['bizum', 'cash'] as const).map((option) => (
                <Label key={option} className='flex items-center gap-2 font-normal'>
                  <RadioGroupItem value={option} /> {option === 'bizum' ? texts.payMethodBizum : texts.payMethodCash}
                </Label>
              ))}
            </RadioGroup>
            <div className='w-28 space-y-1'>
              <Label htmlFor='paid-amount' className='px-1 text-xs text-muted-foreground'>
                {texts.payAmount}
              </Label>
              <div className='relative'>
                <Input
                  id='paid-amount'
                  inputMode='decimal'
                  value={amount ?? planPrice}
                  onChange={(event) => setAmount(event.target.value)}
                  className='h-10 rounded-2xl bg-background pr-7'
                />
                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground'>€</span>
              </div>
            </div>
          </div>
          <Button className='h-12 w-full rounded-full' disabled={isPending || isLocked} onClick={() => onPaid(method, amount ?? planPrice)}>
            {isPending ? <Loader2 className='animate-spin' /> : isLocked ? <Lock /> : <Banknote />} {texts.markPaid}
          </Button>
          <p className='text-center text-xs text-muted-foreground'>{isLocked ? texts.markPaidLocked : texts.markPaidHint}</p>
        </div>
      )}
    </div>
  );
}
