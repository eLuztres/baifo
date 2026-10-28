'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { OFFER_ICON_COMPONENTS } from '@/components/shared/offers/offer-icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { saveOffer } from '@/lib/actions/offer.actions';
import { OFFER_ICONS } from '@/lib/constants';
import { translateMessage, type TranslationKey } from '@/lib/i18n-core';
import { cn } from '@/lib/utils';
import type { OfferInput } from '@/lib/validators';

/** An offer as the admin edits it: its texts in the shop's language, its dates on the shop's clock ("2026-11-29T19:00"). */
export type OfferDraft = Omit<OfferInput, 'id'>;

interface OfferFormProps {
  /** Empty for a new offer. */
  id?: string;
  draft: OfferDraft;
  children: ReactNode;
}

type TextField = 'title' | 'audience' | 'linkUrl' | 'startsAt' | 'endsAt';

/** Creates or changes an offer, in a dialog. */
export default function OfferForm({ id, draft: initialDraft, children }: OfferFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(initialDraft);

  const open = (isNowOpen: boolean) => {
    // Each opening starts from the stored offer (or fresh dates for a new one).
    if (isNowOpen) setDraft(initialDraft);
    setIsOpen(isNowOpen);
  };

  const set = <K extends keyof OfferDraft>(field: K, value: OfferDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));

  const save = () =>
    startTransition(async () => {
      const result = await saveOffer({ ...draft, id });
      toast({ variant: result.success ? 'default' : 'destructive', description: translateMessage(t, result.message) });
      if (!result.success) return;
      setIsOpen(false);
      router.refresh();
    });

  const field = (name: TextField, label: TranslationKey, type = 'text', hint?: TranslationKey) => (
    <div className='space-y-1'>
      <Label htmlFor={`offer-${name}`}>{t(label)}</Label>
      <Input id={`offer-${name}`} type={type} value={draft[name]} onChange={(event) => set(name, event.target.value)} />
      {hint && <p className='text-xs text-muted-foreground'>{t(hint)}</p>}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t(id ? 'OFFERS_ADMIN_EDIT' : 'OFFERS_ADMIN_NEW')}</DialogTitle>
          <DialogDescription>{t('OFFERS_ADMIN_FORM_INTRO')}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='sm:col-span-2'>{field('title', 'OFFERS_ADMIN_FIELD_TITLE')}</div>
          <div className='space-y-1 sm:col-span-2'>
            <Label htmlFor='offer-text'>{t('OFFERS_ADMIN_FIELD_TEXT')}</Label>
            <Textarea id='offer-text' rows={4} value={draft.text} onChange={(event) => set('text', event.target.value)} />
          </div>
          <fieldset className='space-y-2 sm:col-span-2'>
            <legend className='text-sm font-medium'>{t('OFFERS_ADMIN_FIELD_ICON')}</legend>
            <div className='flex flex-wrap gap-2'>
              {OFFER_ICONS.map((icon) => {
                const Icon = OFFER_ICON_COMPONENTS[icon];
                const isChosen = draft.icon === icon;
                return (
                  <button
                    key={icon}
                    type='button'
                    onClick={() => set('icon', icon)}
                    aria-pressed={isChosen}
                    aria-label={icon}
                    title={icon}
                    className={cn(
                      'flex size-12 items-center justify-center rounded-xl border transition-colors',
                      isChosen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className='size-6' />
                  </button>
                );
              })}
            </div>
          </fieldset>
          {field('audience', 'OFFERS_ADMIN_FIELD_AUDIENCE', 'text', 'OFFERS_ADMIN_FIELD_AUDIENCE_HINT')}
          {field('linkUrl', 'OFFERS_ADMIN_FIELD_LINK', 'text', 'OFFERS_ADMIN_FIELD_LINK_HINT')}
          {field('startsAt', 'OFFERS_ADMIN_FIELD_STARTS', 'datetime-local')}
          {field('endsAt', 'OFFERS_ADMIN_FIELD_ENDS', 'datetime-local')}
          <div className='space-y-1'>
            <Label htmlFor='offer-sort-order'>{t('OFFERS_ADMIN_FIELD_ORDER')}</Label>
            <Input
              id='offer-sort-order'
              type='number'
              min={0}
              max={999}
              value={draft.sortOrder}
              onChange={(event) => set('sortOrder', Number(event.target.value) || 0)}
            />
            <p className='text-xs text-muted-foreground'>{t('OFFERS_ADMIN_FIELD_ORDER_HINT')}</p>
          </div>
          <div className='flex items-center gap-2 self-center'>
            <Checkbox id='offer-active' checked={draft.isActive} onCheckedChange={(checked) => set('isActive', checked === true)} />
            <Label htmlFor='offer-active'>{t('OFFERS_ADMIN_FIELD_ACTIVE')}</Label>
          </div>
        </div>
        <div className='flex justify-end pt-2'>
          <Button className='rounded-full' disabled={isPending} onClick={save}>
            {isPending && <Loader2 className='animate-spin' />} {t('OFFERS_ADMIN_SAVE')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
