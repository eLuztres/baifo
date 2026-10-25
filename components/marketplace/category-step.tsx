'use client';

import { useTransition } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setAdminListingCategory, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';
import AiProgress from './ai-progress';
import ListingStage from './listing-stage';

export interface CategoryOption {
  slug: string;
  name: string;
}

interface CategoryStepProps {
  listing: AdminListing;
  categories: CategoryOption[];
  texts: AdminTexts;
  onCategoryChange: (slug: string) => void;
  onNext: () => void;
}

/** Step 2: the category the AI recognized, big and one tap from any other, while the pictures are made. */
export default function CategoryStep({ listing, categories, texts, onCategoryChange, onNext }: CategoryStepProps) {
  const [isPending, startTransition] = useTransition();
  const chosen = categories.find((category) => category.slug === listing.category);
  const isWorking = listing.status === 'PROCESSING';

  const choose = (slug: string) => {
    if (slug === listing.category) return;
    onCategoryChange(slug);
    startTransition(async () => {
      await setAdminListingCategory(listing.id, slug);
    });
  };

  return (
    <div className='mx-auto w-full max-w-xl space-y-5'>
      <ListingStage src={listing.images[0] ?? listing.rawImages[0]} className='aspect-[4/3]'>
        {isWorking && !listing.lastError && <span className='absolute inset-0 animate-pulse bg-primary/15 motion-reduce:animate-none' />}
      </ListingStage>

      <section aria-live='polite' className='space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6'>
        {chosen ? (
          <>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>{texts.categoryTitle}</p>
              <p className='flex items-center gap-2 font-display text-3xl'>
                <Sparkles className='size-6 shrink-0 text-primary' aria-hidden /> {chosen.name}
                {isPending && <Loader2 className='size-5 animate-spin text-muted-foreground' />}
              </p>
              <p className='text-sm text-muted-foreground'>{texts.categoryHint}</p>
            </div>
            <div role='radiogroup' aria-label={texts.categoryLabel} className='flex flex-wrap gap-2'>
              {categories.map((category) => {
                const isChosen = category.slug === chosen.slug;
                return (
                  <button
                    key={category.slug}
                    type='button'
                    role='radio'
                    aria-checked={isChosen}
                    onClick={() => choose(category.slug)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition',
                      isChosen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className='flex items-center gap-3 text-muted-foreground'>
            <Loader2 className='size-5 animate-spin text-primary' /> {texts.categoryWaiting}
          </p>
        )}
      </section>

      <AiProgress listing={listing} texts={texts} />

      <div className='sticky bottom-4 z-10 space-y-1'>
        <Button className='h-14 w-full rounded-full text-base shadow-xl shadow-primary/20' disabled={isWorking || !chosen} onClick={onNext}>
          {isWorking ? <Loader2 className='animate-spin' /> : <ArrowRight />} {texts.next}
        </Button>
        <p className='text-center text-xs text-muted-foreground'>{isWorking ? texts.picturesWorking : texts.picturesDone}</p>
      </div>
    </div>
  );
}
