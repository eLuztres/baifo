'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Share, X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { ONE_PAGE_PATH, SECTION_IDS } from '@/components/shared/home/one-page';
import { useActiveSection } from '@/components/shared/header/use-active-section';
import { cn } from '@/lib/utils';

const CLOSED_STORAGE_KEY = 'ios-install-hint-closed';

interface IosInstallHintProps {
  shopName: string;
}

// iPadOS calls itself a Mac; only its touch screen gives it away.
const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

const isInstalled = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

const wasClosed = () => {
  try {
    return localStorage.getItem(CLOSED_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

/** iPhones have no install banner like Android's, so the home page explains the Share → Add to Home Screen way once.
    Closed, it never comes back. In the layout, not the page: the page's entrance animation would be the frame for `fixed`. */
const IosInstallHint = ({ shopName }: IosInstallHintProps) => {
  const { t } = useI18n();
  const pathname = usePathname();
  const isOnStartScreen = useActiveSection() === SECTION_IDS.home;
  // Decided in the browser only, so the server's page never flashes it.
  const [isShown, setIsShown] = useState(false);

  useEffect(() => setIsShown(isIos() && !isInstalled() && !wasClosed()), []);

  if (!isShown || pathname !== ONE_PAGE_PATH) return null;

  const close = () => {
    try {
      localStorage.setItem(CLOSED_STORAGE_KEY, '1');
    } catch {}
    setIsShown(false);
  };

  return (
    <aside
      aria-label={t('IOS_INSTALL_TITLE', { shop: shopName })}
      // At the top: the bottom belongs to the offer announcement.
      className={cn(
        'fixed inset-x-3 top-[4.5rem] z-30 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-border bg-card/90 p-3 pr-1.5 text-card-foreground shadow-xl shadow-primary/15 backdrop-blur-md transition-[opacity,visibility] animate-in fade-in slide-in-from-top-4 duration-500 sm:top-24',
        !isOnStartScreen && 'pointer-events-none invisible opacity-0'
      )}
    >
      <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
        <Share className='size-5' aria-hidden />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block font-display text-sm leading-snug sm:text-base'>{t('IOS_INSTALL_TITLE', { shop: shopName })}</span>
        <span className='block text-xs text-muted-foreground'>{t('IOS_INSTALL_STEPS')}</span>
      </span>
      <Button variant='ghost' size='icon' onClick={close} aria-label={t('IOS_INSTALL_CLOSE')} className='size-8 shrink-0 rounded-full text-muted-foreground'>
        <X />
      </Button>
    </aside>
  );
};

export default IosInstallHint;
