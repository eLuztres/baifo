import type { ReactNode } from 'react';
import { Store } from 'lucide-react';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import ShareButton from '@/components/shared/product/share-button';

interface PartnerHeroProps {
  partnerId: string;
  name: string;
  text: string;
  icon: string | null;
  /** "Mercadillo", above its sign. */
  badge: string;
  /** "7 anuncios". */
  countLabel: string;
  shareTitle: string;
  sharePath: string;
  /** The prefilled WhatsApp message; missing: no contact button (no number, or no OK to show it). */
  contactMessage?: string;
  /** The round way back, at the top left. */
  back: ReactNode;
}

/** The top of a partner's mercadillo page: its sign, name and words, how many listings, and share and contact. */
export default function PartnerHero({ partnerId, name, text, icon, badge, countLabel, shareTitle, sharePath, contactMessage, back }: PartnerHeroProps) {
  return (
    <section className='relative overflow-hidden rounded-3xl border border-border bg-card px-5 pb-7 pt-10 text-center sm:px-8 sm:py-8'>
      <div aria-hidden className='absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/20 to-transparent' />
      <div className='absolute left-4 top-4 z-10'>{back}</div>
      <div className='relative flex flex-col items-center gap-4 sm:gap-5'>
        <span className='inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary'>
          <Store className='size-3.5' aria-hidden />
          {badge}
        </span>
        <MercadilloIcon src={icon} sizes='(min-width: 640px) 11rem, 10rem' className='size-40 shadow-2xl shadow-primary/25 ring-4 ring-background sm:size-44' />
        <p className='max-w-full text-balance break-words font-display text-5xl leading-none sm:text-6xl'>{name}</p>
        {text && <p className='max-w-xl text-pretty text-base leading-relaxed text-foreground/85 sm:text-lg'>{text}</p>}
        <p className='rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground'>{countLabel}</p>
        {/* Share as a round icon, so "Contactar" keeps the rest of the line. */}
        <div className='flex w-full max-w-md items-center justify-center gap-3'>
          <ShareButton title={shareTitle} path={sharePath} className='size-11 border border-input bg-background text-foreground' />
          {contactMessage && <ContactSellerButton partnerId={partnerId} message={contactMessage} className='min-w-0 flex-1' />}
        </div>
      </div>
    </section>
  );
}
