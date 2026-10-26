import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { APP_NAME } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import WhatsAppQr from '@/components/shared/whatsapp-qr';
import { SECTION_IDS, sectionHref } from './one-page';
import room from './dark-room.module.css';
import styles from './dark-room-hero.module.css';

interface DarkRoomHeroProps {
  image?: string;
}

export default async function DarkRoomHero({ image }: DarkRoomHeroProps) {
  const { t } = await getT();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl : undefined;

  return (
    <section className={cn(room.bleed, styles.hero)}>
      <div className={styles.card}>
        <h1 className={cn(room.display, styles.title)}>
          <span>{t('HOME_HERO_WORD_1')}</span>
          <span>{t('HOME_HERO_WORD_2')}</span>
          <span>{t('HOME_HERO_WORD_3')}</span>
        </h1>

        <div className={styles.body}>
          <p className={cn(room.display, styles.facts)}>
            <span>{t('HOME_HERO_FACT_1')}</span>
            <span>{t('HOME_HERO_FACT_2', { shop: APP_NAME })}</span>
          </p>
          <p className={styles.sentence}>{t('HOME_HERO_TEXT')}</p>
        </div>

        <div className={styles.foot}>
          <Link href={sectionHref(SECTION_IDS.showroom)} className={room.action}>
            {t('HOME_HERO_CTA')}
            <ArrowRight className='size-4' />
          </Link>
          {!whatsappUrl && (
            <Link href={sectionHref(SECTION_IDS.contact)} className={cn(room.textLink, room.small)}>
              {t('HOME_HERO_ORDER')}
            </Link>
          )}
        </div>
      </div>

      {/* Selling starts with a WhatsApp message, so that is the hero's centerpiece. */}
      {whatsappUrl && (
        <div className={styles.sell}>
          <Link href={whatsappUrl} target='_blank' rel='noopener noreferrer' aria-labelledby='hero-sell' className={styles.whatsapp}>
            <WhatsAppLogo />
          </Link>
          <p id='hero-sell' className={cn(room.small, styles.sellLabel)}>
            {t('HOME_HERO_ORDER')}
          </p>
          {/* A computer can't open WhatsApp like a phone does: there the phone scans this instead. */}
          <figure className={styles.qr}>
            <WhatsAppQr url={whatsappUrl} label={t('HOME_HERO_ORDER')} className='size-28' />
            <figcaption>{t('HOME_HERO_SCAN')}</figcaption>
          </figure>
        </div>
      )}

      {/* One real ring, floating in the dark like a jewel in a display window. */}
      {image && (
        <div className={styles.jewel}>
          <Image src={image} alt='' fill priority unoptimized sizes='34rem' />
        </div>
      )}
    </section>
  );
}

// lucide has no brand icons, so the WhatsApp glyph is drawn inline.
export function WhatsAppLogo() {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
      <path d='M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.41 9.41 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.23 9.43-9.44 9.43zm8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.28l5.68-1.49a11.33 11.33 0 0 0 5.77 1.47h.01c6.26 0 11.35-5.09 11.35-11.34 0-3.03-1.18-5.88-3.33-8.03z' />
    </svg>
  );
}
