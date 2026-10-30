'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronRight, X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { ONE_PAGE_PATH, SECTION_IDS } from '@/components/shared/home/one-page';
import { useActiveSection } from '@/components/shared/header/use-active-section';
import { OFFERS_PATH } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { OfferItem } from '@/lib/offers-core';
import OfferIcon from './offer-icon';

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
  /** The admin's floating "+" sits in the bottom right corner on phones. */
  hasAdminButton: boolean;
}

/** The running offers as a slim banner over the bottom of the home page's start screen; several take turns. Closed, they
    stay closed for this visitor until a new offer starts (they stay on the offers page). In the layout, not the page: the page's entrance
    animation would make it the frame for `fixed`. */
const OfferAnnouncement = ({ items, hasAdminButton }: OfferAnnouncementProps) => {
  const { t } = useI18n();
  const pathname = usePathname();
  // Nothing until the browser said what was closed, so a closed announcement never flashes.
  const [closedIds, setClosedIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isOnStartScreen = useActiveSection() === SECTION_IDS.home;

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

  const { offer } = current;

  return (
    <aside
      aria-label={t('OFFERS_ANNOUNCEMENT_LABEL')}
      data-offer-popup
      {...(count > 1 && { 'aria-roledescription': 'carousel' })}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      /* Wide screens: over the decorative picture on the right, so it covers neither the hero's buttons nor the WhatsApp QR code. */
      className={cn(
        'fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-sm items-center gap-1 rounded-2xl border border-border bg-card/90 p-1.5 text-card-foreground shadow-xl shadow-primary/15 backdrop-blur-md transition-[opacity,visibility] animate-in fade-in slide-in-from-bottom-4 duration-500 sm:bottom-6 lg:inset-x-auto lg:right-24',
        hasAdminButton && 'right-20 sm:right-24',
        // Hidden, not removed, past the start screen: the hero lifts its ad for the popup and mustn't jump while scrolling.
        !isOnStartScreen && 'pointer-events-none invisible opacity-0'
      )}
    >
      <Link key={offer.id} href={OFFERS_PATH} className='group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 animate-in fade-in duration-500'>
        <span className='relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground'>
          {offer.image ? <Image src={offer.image} alt='' fill sizes='2.75rem' className='object-cover' /> : <OfferIcon icon={offer.icon} className='size-5' />}
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block truncate font-display text-sm leading-snug sm:text-base'>{offer.title}</span>
          {count > 1 ? (
            <span className='mt-1.5 flex gap-1' aria-hidden>
              {shown.map(({ offer: { id } }, dot) => (
                <span key={id} className={cn('h-1 rounded-full transition-all', dot === index % count ? 'w-4 bg-primary' : 'w-1 bg-muted-foreground/40')} />
              ))}
            </span>
          ) : (
            offer.audience && <span className='block truncate text-xs text-muted-foreground'>{offer.audience}</span>
          )}
        </span>
        <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' aria-hidden />
      </Link>
      <Button variant='ghost' size='icon' onClick={close} aria-label={t('OFFERS_CLOSE')} className='size-8 shrink-0 rounded-full text-muted-foreground'>
        <X />
      </Button>
    </aside>
  );
};

export default OfferAnnouncement;
