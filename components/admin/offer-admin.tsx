'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Square, Trash2 } from 'lucide-react';
import OfferForm, { type OfferDraft } from '@/components/admin/offer-form';
import { useI18n } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import OfferIcon from '@/components/shared/offers/offer-icon';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteOffer, endOffer } from '@/lib/actions/offer.actions';
import { translateMessage, type TranslationKey } from '@/lib/i18n-core';
import type { OfferStatus } from '@/lib/offers-core';

/** One stored offer for the admin list. */
export interface AdminOffer {
  id: string;
  status: OfferStatus;
  draft: OfferDraft;
  /** "28/10/2026, 10:00 – 30/11/2026, 23:59" on the shop's clock. */
  period: string;
}

interface OfferAdminProps {
  offers: AdminOffer[];
  newDraft: OfferDraft;
}

const GROUPS: { status: OfferStatus; title: TranslationKey }[] = [
  { status: 'running', title: 'OFFERS_ADMIN_RUNNING' },
  { status: 'upcoming', title: 'OFFERS_ADMIN_UPCOMING' },
  { status: 'hidden', title: 'OFFERS_ADMIN_HIDDEN' },
  { status: 'ended', title: 'OFFERS_ADMIN_ENDED_GROUP' },
];

/** The offers by where they stand: running, upcoming, switched off and ended; each can be changed, ended or deleted. */
export default function OfferAdmin({ offers, newDraft }: OfferAdminProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const end = (id: string) =>
    startTransition(async () => {
      const result = await endOffer(id);
      toast({ variant: result.success ? 'default' : 'destructive', description: translateMessage(t, result.message) });
      if (result.success) router.refresh();
    });

  const remove = async (id: string) => {
    const result = await deleteOffer(id);
    if (result.success) router.refresh();
    return result;
  };

  return (
    <div className='space-y-8'>
      <OfferForm draft={newDraft}>
        <Button className='rounded-full'>
          <Plus /> {t('OFFERS_ADMIN_NEW')}
        </Button>
      </OfferForm>

      {offers.length === 0 && <p className='text-muted-foreground'>{t('OFFERS_ADMIN_EMPTY')}</p>}

      {GROUPS.map(({ status, title }) => {
        const group = offers.filter((offer) => offer.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status} className='space-y-3'>
            <h3 className='text-lg font-semibold'>
              {t(title)} <span className='text-muted-foreground'>({group.length})</span>
            </h3>
            <ul className='grid gap-3 lg:grid-cols-2'>
              {group.map((offer) => (
                <li key={offer.id} className='flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:flex-row sm:items-start'>
                  <div className='flex min-w-0 flex-1 gap-3'>
                    <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                      <OfferIcon icon={offer.draft.icon} className='size-5' />
                    </div>
                    <div className='min-w-0 space-y-1'>
                      <p className='font-medium break-words'>{offer.draft.title}</p>
                      {offer.draft.audience && <p className='text-xs uppercase tracking-wider text-primary'>{offer.draft.audience}</p>}
                      <p className='text-sm text-muted-foreground'>{offer.period}</p>
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-2 sm:justify-end'>
                    <OfferForm id={offer.id} draft={offer.draft}>
                      <Button size='sm' variant='outline' className='rounded-full'>
                        <Pencil /> {t('OFFERS_ADMIN_EDIT_BUTTON')}
                      </Button>
                    </OfferForm>
                    {status !== 'ended' && (
                      <Button size='sm' variant='outline' className='rounded-full' disabled={isPending} onClick={() => end(offer.id)}>
                        {isPending ? <Loader2 className='animate-spin' /> : <Square />} {t('OFFERS_ADMIN_END')}
                      </Button>
                    )}
                    <DeleteDialog
                      id={offer.id}
                      action={remove}
                      description={t('OFFERS_ADMIN_DELETE_TEXT')}
                      trigger={
                        <Button size='sm' variant='ghost' className='rounded-full text-destructive hover:text-destructive'>
                          <Trash2 /> {t('DELETE_DIALOG_CONFIRM')}
                        </Button>
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
