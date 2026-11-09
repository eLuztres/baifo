'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import ScoutPicture from '@/components/shared/scout-picture';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ScoutChoice {
  name: string;
  image: string | null;
  /** The shop's WhatsApp with "I come from {name}" and their link already written. */
  href: string;
}

interface WhoSentYouLinkProps {
  /** The shop's WhatsApp without a señalador; also what the link opens before the page has loaded. */
  href: string;
  scouts: ScoutChoice[];
  shopName: string;
  className?: string;
  children: ReactNode;
}

const OPENS_WHATSAPP = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** A link to place a listing that first asks who told the person about the shop, then opens WhatsApp from that señalador. */
export default function WhoSentYouLink({ href, scouts, shopName, className, children }: WhoSentYouLinkProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rowClass = 'flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2 pr-3 text-left transition hover:border-primary';

  return (
    <>
      <a
        href={href}
        {...OPENS_WHATSAPP}
        className={className}
        onClick={(event) => {
          // Without señaladores there's nothing to ask: straight to WhatsApp.
          if (scouts.length === 0) return;
          event.preventDefault();
          setIsOpen(true);
        }}
      >
        {children}
      </a>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='flex max-h-[85dvh] flex-col sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{t('WHO_SENT_YOU_TITLE', { shop: shopName })}</DialogTitle>
            <DialogDescription>{t('WHO_SENT_YOU_TEXT')}</DialogDescription>
          </DialogHeader>
          <ul className='-mx-1 min-h-0 space-y-2 overflow-y-auto px-1'>
            {scouts.map((scout) => (
              <li key={scout.href}>
                <a href={scout.href} {...OPENS_WHATSAPP} className={rowClass} onClick={() => setIsOpen(false)}>
                  <ScoutPicture name={scout.name} image={scout.image} className='size-12' />
                  <span className='min-w-0 flex-1 truncate font-medium'>{scout.name}</span>
                  <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
                </a>
              </li>
            ))}
          </ul>
          <a href={href} {...OPENS_WHATSAPP} className='text-center text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline' onClick={() => setIsOpen(false)}>
            {t('WHO_SENT_YOU_NOBODY')}
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
