'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Loader2, MessageCircle } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import type { ListingType, PriceMode } from '@/lib/constants';
import { markAdminListingSold, shareAdminListing } from '@/lib/marketplace/admin.actions';
import { markSoldText, type AdminTexts } from '@/lib/marketplace/admin-texts';

interface PublishedViewProps {
  listingId: string;
  type: ListingType;
  /** "Enviar a la persona": ready to send their private link instead of online. */
  isForPerson: boolean;
  image?: string;
  title: string;
  /** Fixed-2 string in euros. */
  price: string | null;
  priceMode?: PriceMode | null;
  slug?: string;
  texts: AdminTexts;
  onKeepEditing: () => void;
}

// Baifo's listings are always in euros.
const EURO = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
// Where a finished listing leads: all listings, so it's clear the work is done.
const FINISHED_URL = '/explore';

/** The end of a new listing: the listing as buyers see it, sent to the person or online, then OK. */
export default function PublishedView({ listingId, type, isForPerson, image, title, price, priceMode, slug, texts, onKeepEditing }: PublishedViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');
  // "Desde" and "Hasta" go before the amount; a set price stands alone.
  const priceLabel = priceMode === 'FROM' || priceMode === 'UP_TO' ? `${texts[`priceMode_${priceMode}`]} ` : '';
  const isDone = !isForPerson || isSent;

  // The tab opens on the tap itself, or the browser blocks it as a popup once the link arrives.
  const sendToPerson = () => {
    const tab = window.open('', '_blank');
    startTransition(async () => {
      const result = await shareAdminListing(listingId);
      if (!(result.success && 'url' in result && result.url)) {
        tab?.close();
        return setError(result.message);
      }
      if (tab) tab.location.href = result.url;
      else window.location.assign(result.url);
      setError('');
      setIsSent(true);
    });
  };

  const markSold = () =>
    startTransition(async () => {
      const result = await markAdminListingSold(listingId);
      if (!result.success) return setError(result.message);
      router.push(FINISHED_URL);
    });

  const card = (
    <div className='w-full overflow-hidden rounded-3xl border border-border bg-card text-left shadow-xl'>
      <div className='relative aspect-[4/5] bg-muted'>{image && <ProductMedia src={image} alt={title} fill sizes='28rem' />}</div>
      <div className='space-y-1 p-4'>
        <p className='font-display text-xl'>{title}</p>
        {price && Number(price) > 0 && priceMode !== 'NONE' && <p className='text-lg font-semibold text-primary'>{priceLabel + EURO.format(Number(price))}</p>}
      </div>
    </div>
  );

  return (
    <div className='mx-auto flex w-full max-w-md flex-col items-center gap-6 py-4 text-center'>
      <span className='flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-500 starting:scale-50 motion-reduce:transition-none'>
        {isDone ? <Check className='size-10' strokeWidth={3} aria-hidden /> : <MessageCircle className='size-9' aria-hidden />}
      </span>
      <div className='space-y-1'>
        <h2 className='font-display text-3xl'>{!isForPerson ? texts.liveTitle : isSent ? texts.sentTitle : texts.readyToSendTitle}</h2>
        <p className='text-pretty text-muted-foreground'>{!isForPerson ? texts.publishedHint : isSent ? texts.sentHint : texts.sendWhatsAppHint}</p>
      </div>

      {/* Online, the card opens the listing as buyers see it. */}
      {slug && !isForPerson ? (
        <Link href={`/product/${slug}`} target='_blank' className='block w-full transition hover:opacity-90'>
          {card}
        </Link>
      ) : (
        card
      )}

      {error && (
        <p role='alert' className='w-full rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
          {error}
        </p>
      )}

      <div className='flex w-full flex-col gap-3'>
        {isDone ? (
          <Button size='lg' className='h-14 rounded-full text-base' disabled={isPending} onClick={() => router.push(FINISHED_URL)}>
            {texts.finishOk}
          </Button>
        ) : (
          <Button size='lg' className='h-14 rounded-full text-base' disabled={isPending} onClick={sendToPerson}>
            {isPending ? <Loader2 className='animate-spin' /> : <MessageCircle />} {texts.sendWhatsApp}
          </Button>
        )}
        <div className='flex flex-wrap justify-center gap-2'>
          {isSent && (
            <Button variant='ghost' className='rounded-full' disabled={isPending} onClick={sendToPerson}>
              {texts.resendLink}
            </Button>
          )}
          {!isForPerson && (
            // Selling takes the listing out of the shop at once, so it asks first.
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant='outline' className='rounded-full' disabled={isPending}>
                  {markSoldText(texts, type)}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{markSoldText(texts, type)}</AlertDialogTitle>
                  <AlertDialogDescription>{texts.markSoldConfirm}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{texts.markSoldCancel}</AlertDialogCancel>
                  <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={markSold}>
                    {markSoldText(texts, type)}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!isSent && (
            <Button variant='ghost' className='rounded-full' disabled={isPending} onClick={onKeepEditing}>
              {texts.keepEditing}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
