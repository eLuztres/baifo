import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WhatsAppQr from '@/components/shared/whatsapp-qr';
import { BRAND } from '@/lib/brand';
import { APP_NAME } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { WhatsAppLogo } from './dark-room-hero';
import { SECTION_IDS } from './one-page';

/** The home page's opening in one short block: what the shop is, one sentence, and the two ways in. */
export default async function CompactHero() {
  const { t } = await getT();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl : undefined;

  return (
    <section id={SECTION_IDS.home} className='flex items-center gap-4 sm:gap-8'>
      <div className='min-w-0 flex-1 space-y-3 sm:space-y-4'>
        <h1 className='font-display text-3xl leading-tight text-balance sm:text-5xl'>
          {t('HOME_HERO_FACT_1')} {t('HOME_HERO_FACT_2', { shop: APP_NAME })}
        </h1>
        <p className='text-muted-foreground sm:text-lg'>{t('HOME_HERO_TEXT')}</p>
        <div className='flex flex-wrap gap-2'>
          <Button asChild className='rounded-full'>
            <Link href='/explore'>
              {t('HOME_HERO_CTA')}
              <ArrowRight />
            </Link>
          </Button>
          {whatsappUrl && (
            <Button asChild variant='outline' className='rounded-full'>
              <Link href={whatsappUrl} target='_blank' rel='noopener noreferrer'>
                <span className='size-4 text-primary'>
                  <WhatsAppLogo />
                </span>
                {t('HOME_HERO_ORDER')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* A computer can't open WhatsApp like a phone does: there the phone scans this instead. */}
      {whatsappUrl && (
        <figure className='hidden shrink-0 flex-col items-center gap-1 text-center text-xs text-muted-foreground lg:flex'>
          <WhatsAppQr url={whatsappUrl} label={t('HOME_HERO_ORDER')} className='size-24' />
          <figcaption className='max-w-28'>{t('HOME_HERO_SCAN')}</figcaption>
        </figure>
      )}
      {BRAND.heroImage && (
        <div className='relative size-24 shrink-0 sm:size-40'>
          <Image src={BRAND.heroImage} alt='' fill priority sizes='(min-width: 640px) 10rem, 6rem' className='object-contain' />
        </div>
      )}
    </section>
  );
}
