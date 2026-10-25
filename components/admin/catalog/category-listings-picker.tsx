'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ListPlus, Search } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { setProductCategory } from '@/lib/actions/category.actions';
import { translateMessage } from '@/lib/i18n-core';
import { cn } from '@/lib/utils';

export interface PickableListing {
  id: string;
  name: string;
  image?: string;
  isService: boolean;
  categoryIds: string[];
}

interface CategoryListingsPickerProps {
  categoryId: string;
  categoryName: string;
  /** Every product and service of the shop. */
  listings: PickableListing[];
}

/** Puts any product or service into the open category or takes it out, with one tap each; mixed categories are fine. */
export default function CategoryListingsPicker({ categoryId, categoryName, listings }: CategoryListingsPickerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Shown at once; the page reloads its lists when the picker closes.
  const [chosen, setChosen] = useState(() => new Set(listings.filter((item) => item.categoryIds.includes(categoryId)).map((item) => item.id)));

  // The ones already in the category first, so it's easy to see and take something out.
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    return listings
      .filter((item) => !words || item.name.toLowerCase().includes(words))
      .sort((a, b) => Number(chosen.has(b.id)) - Number(chosen.has(a.id)));
    // Sorted only when the picker opens or the search changes, so a tap never makes the tiles jump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, query, isOpen]);

  const toggle = async (id: string) => {
    const isIn = !chosen.has(id);
    const flip = (current: Set<string>) => {
      const next = new Set(current);
      if (isIn) next.add(id);
      else next.delete(id);
      return next;
    };
    setChosen(flip);
    const result = await setProductCategory(id, categoryId, isIn);
    if (!result.success) {
      setChosen((current) => {
        const next = new Set(current);
        if (isIn) next.delete(id);
        else next.add(id);
        return next;
      });
      toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    }
  };

  const close = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setQuery('');
      router.refresh();
    }
  };

  return (
    <>
      <Button size='sm' variant='outline' className='h-8 rounded-full border-primary/40' onClick={() => setIsOpen(true)}>
        <ListPlus /> {t('CATEGORY_LISTINGS_ADD')}
      </Button>
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className='flex max-h-[90dvh] flex-col sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{t('CATEGORY_LISTINGS_TITLE', { name: categoryName })}</DialogTitle>
            <DialogDescription>{t('CATEGORY_LISTINGS_HINT')}</DialogDescription>
          </DialogHeader>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
            <Input
              type='search'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('CATEGORY_LISTINGS_SEARCH')}
              aria-label={t('CATEGORY_LISTINGS_SEARCH')}
              className='pl-9'
            />
          </div>
          <ul className='-mx-1 grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4'>
            {shown.map((item) => {
              const isChosen = chosen.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type='button'
                    aria-pressed={isChosen}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      'group relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-muted text-left transition',
                      isChosen ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                    )}
                  >
                    {item.image && <ProductMedia src={item.image} alt='' fill sizes='9rem' className='object-cover' />}
                    <span
                      className={cn(
                        'absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border-2 shadow transition',
                        isChosen ? 'border-primary bg-primary text-primary-foreground' : 'border-background bg-background/80'
                      )}
                    >
                      {isChosen && <Check className='size-3.5' />}
                    </span>
                    {item.isService && (
                      <span className='absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-medium text-primary-foreground'>
                        {t('EXPLORE_SERVICE_BADGE')}
                      </span>
                    )}
                    <span className='absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6 text-xs leading-tight text-white'>
                      {item.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Button className='rounded-full' onClick={() => close(false)}>
            {t('CATEGORY_LISTINGS_DONE')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
