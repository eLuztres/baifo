import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import { SECTION_IDS, sectionHref } from './one-page';
import room from './dark-room.module.css';
import styles from './dark-room-hero.module.css';

interface DarkRoomHeroProps {
  image?: string;
}

export default async function DarkRoomHero({ image }: DarkRoomHeroProps) {
  const { t } = await getT();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.whatsappUrl : undefined;
  const orderHref = whatsappUrl ?? sectionHref(SECTION_IDS.contact);

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
            <span>{t('HOME_HERO_FACT_2')}</span>
          </p>
          <p className={styles.sentence}>{t('HOME_HERO_TEXT')}</p>
        </div>

        <div className={styles.foot}>
          <Link href={sectionHref(SECTION_IDS.showroom)} className={room.action}>
            {t('HOME_HERO_CTA')}
            <ArrowRight className='size-4' />
          </Link>
          <Link
            href={orderHref}
            target={whatsappUrl ? '_blank' : undefined}
            rel={whatsappUrl ? 'noopener noreferrer' : undefined}
            className={cn(room.textLink, room.small)}
          >
            {t('HOME_HERO_ORDER')}
          </Link>
        </div>
      </div>

      {/* One real ring, floating in the dark like a jewel in a display window. */}
      {image && (
        <div className={styles.jewel}>
          <Image src={image} alt='' fill priority unoptimized sizes='34rem' />
        </div>
      )}
    </section>
  );
}
