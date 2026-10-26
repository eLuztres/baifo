'use client';

import Link from 'next/link';
import { Check, ExternalLink, Plus } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

interface PublishedViewProps {
  image?: string;
  title: string;
  /** Fixed-2 string in euros. */
  price: string | null;
  /** The upper end of a wanted ad's budget. */
  priceMax?: string | null;
  slug?: string;
  texts: AdminTexts;
  onKeepEditing: () => void;
}

// Baifo's listings are always in euros.
const EURO = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/** The moment right after "Publish": unmistakably done, with the listing as buyers see it. */
export default function PublishedView({ image, title, price, priceMax, slug, texts, onKeepEditing }: PublishedViewProps) {
  return (
    <div className='mx-auto flex w-full max-w-md flex-col items-center gap-6 py-4 text-center'>
      <span className='flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-500 starting:scale-50 motion-reduce:transition-none'>
        <Check className='size-10' strokeWidth={3} aria-hidden />
      </span>
      <div className='space-y-1'>
        <h2 className='font-display text-3xl'>{texts.liveTitle}</h2>
        <p className='text-muted-foreground'>{texts.publishedHint}</p>
      </div>

      <div className='w-full overflow-hidden rounded-3xl border border-border bg-card text-left shadow-xl'>
        <div className='relative aspect-[4/5] bg-muted'>{image && <ProductMedia src={image} alt={title} fill sizes='28rem' />}</div>
        <div className='space-y-1 p-4'>
          <p className='font-display text-xl'>{title}</p>
          {price && <p className='text-lg font-semibold text-primary'>{priceMax ? EURO.formatRange(Number(price), Number(priceMax)) : EURO.format(Number(price))}</p>}
        </div>
      </div>

      <div className='flex w-full flex-col gap-3'>
        {slug && (
          <Button asChild size='lg' className='h-14 rounded-full text-base'>
            <Link href={`/product/${slug}`} target='_blank'>
              <ExternalLink /> {texts.viewListing}
            </Link>
          </Button>
        )}
        <Button asChild size='lg' variant='outline' className='h-12 rounded-full'>
          <Link href='/admin/listings/new'>
            <Plus /> {texts.newAnother}
          </Link>
        </Button>
        <Button variant='ghost' className='rounded-full' onClick={onKeepEditing}>
          {texts.keepEditing}
        </Button>
      </div>
    </div>
  );
}
