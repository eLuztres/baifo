'use client';

import { Share2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  /** The product's or service's name, shown in the share sheet. */
  title: string;
  /** What to share, e.g. "/explore?mercadillo=magma"; missing: this page. */
  path?: string;
  /** A full button saying "Share", for where sharing is one of the main things to do. */
  isLabeled?: boolean;
  className?: string;
}

/** Shares the page through the phone's share sheet (WhatsApp, …), or copies its link where there is none (most desktops). */
export default function ShareButton({ title, path, isLabeled, className }: ShareButtonProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const share = async () => {
    // Without the query (e.g. the filters someone came through): they mean nothing to the person it is sent to.
    const url = `${window.location.origin}${path ?? window.location.pathname}`;
    if (navigator.share) {
      // Closing the share sheet rejects too; that is not an error.
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ description: t('SHARE_COPIED') });
    } catch {
      toast({ variant: 'destructive', description: t('SHARE_FAILED') });
    }
  };

  if (isLabeled) {
    return (
      <Button type='button' variant='outline' onClick={share} className={cn('h-11 rounded-full', className)}>
        <Share2 /> {t('SHARE')}
      </Button>
    );
  }

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      onClick={share}
      aria-label={t('SHARE')}
      title={t('SHARE')}
      className={cn('size-10 shrink-0 rounded-full text-muted-foreground hover:text-primary', className)}
    >
      <Share2 className='size-5' />
    </Button>
  );
}
