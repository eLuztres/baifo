'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { ONE_PAGE_PATH } from '@/components/shared/home/one-page';
import { OFFERS_PATH } from '@/lib/constants';
import { cn } from '@/lib/utils';
import OfferCard, { type OfferItem } from './offer-card';

const CLOSED_STORAGE_KEY = 'closed-offers';
const AUTO_ADVANCE_MS = 8000;

const readClosedIds = (): string[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CLOSED_STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const saveClosedIds = (ids: string[]) => {
  try {
    localStorage.setItem(CLOSED_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
};

interface OfferAnnouncementProps {
  items: OfferItem[];
}

/** The running offers, big over the bottom of the home page; several take turns. Closed, they stay closed for this
    visitor until a new offer starts (they stay on the offers page). In the layout, not the page: the page's entrance
    animation would make it the frame for `fixed`. */
const OfferAnnouncement = ({ items }: OfferAnnouncementProps) => {
  const { t } = useI18n();
  const pathname = usePathname();
  // Nothing until the browser said what was closed, so a closed announcement never flashes.
  const [closedIds, setClosedIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => setClosedIds(readClosedIds()), []);

  const shown = closedIds ? items.filter(({ offer }) => !closedIds.includes(offer.id)) : [];
  const count = shown.length;

  useEffect(() => {
    if (count < 2 || isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [count, isPaused]);

  if (pathname !== ONE_PAGE_PATH || count === 0) return null;
  const current = shown[index % count];

  const close = () => {
    // Only offers still running are remembered, so the list never grows.
    const runningIds = new Set(items.map(({ offer }) => offer.id));
    const ids = [...new Set([...(closedIds ?? []).filter((id) => runningIds.has(id)), ...shown.map(({ offer }) => offer.id)])];
    saveClosedIds(ids);
    setClosedIds(ids);
  };
  const turn = (step: number) => setIndex((current) => (current + step + count) % count);

  return (
    <aside
      aria-label={t('OFFERS_ANNOUNCEMENT_LABEL')}
      {...(count > 1 && { 'aria-roledescription': 'carousel' })}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      /* Wide screens: over the decorative picture on the right, so it covers neither the hero's buttons nor the WhatsApp QR code. */
      className='fixed inset-x-3 bottom-3 z-30 mx-auto max-w-2xl rounded-3xl border border-border bg-card/95 p-4 pr-12 text-card-foreground shadow-2xl shadow-primary/20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-8 duration-500 sm:bottom-6 sm:p-7 sm:pr-14 lg:inset-x-auto lg:right-24 lg:max-w-md'
    >
      <Button variant='ghost' size='icon' onClick={close} aria-label={t('OFFERS_CLOSE')} className='absolute top-2 right-2 rounded-full sm:top-3 sm:right-3'>
        <X />
      </Button>
      <OfferCard key={current.offer.id} {...current} linkLabel={t('OFFERS_MORE')} size='compact' className='animate-in fade-in duration-500' />
      {/* Phones: room on the right of the controls for the admin's floating + button. */}
      {count > 1 && (
        <div className='mt-3 flex items-center justify-between gap-3 pr-12 sm:mt-4 sm:pr-0'>
          <div className='flex items-center gap-1'>
            <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => turn(-1)} aria-label={t('OFFERS_PREVIOUS')}>
              <ChevronLeft />
            </Button>
            {shown.map(({ offer }, dot) => (
              <button
                key={offer.id}
                type='button'
                onClick={() => setIndex(dot)}
                aria-label={t('OFFERS_SHOW', { number: dot + 1, count })}
                aria-current={dot === index % count}
                className={cn('h-2 rounded-full transition-all', dot === index % count ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground')}
              />
            ))}
            <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => turn(1)} aria-label={t('OFFERS_NEXT')}>
              <ChevronRight />
            </Button>
          </div>
          <Link href={OFFERS_PATH} className='shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline'>
            {t('OFFERS_SEE_ALL')}
          </Link>
        </div>
      )}
    </aside>
  );
};

export default OfferAnnouncement;
