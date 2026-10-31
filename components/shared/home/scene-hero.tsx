import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { APP_NAME } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { LISTING_FROM_PRICE } from '@/lib/marketplace/config';
import { cn } from '@/lib/utils';
import { WhatsAppLogo } from './dark-room-hero';
import { SECTION_IDS, sectionHref } from './one-page';
import room from './dark-room.module.css';
import { type HeroPicture, heroAltKey } from './hero-pictures';
import SceneCrossfade from './scene-crossfade';
import styles from './scene-hero.module.css';

interface SceneHeroProps {
  pictures: HeroPicture[];
}

/** The opening screen: a full-screen island picture of the goat, a small title and one way into the listings. */
export default async function SceneHero({ pictures }: SceneHeroProps) {
  const { t } = await getT();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;
  const order = t('HOME_HERO_ORDER', { price: LISTING_FROM_PRICE });
  const orderText = t('HOME_HERO_ORDER_TEXT');
  // The alt keys follow the file names, so a picture without its own text stays decorative instead of reading out the key.
  const scenes = pictures.map(({ name, tall, wide, figure }) => {
    const key = heroAltKey(name);
    const alt = t(key as TranslationKey);
    return { tall, wide, figure, alt: alt === key ? '' : alt };
  });

  return (
    <section className={cn(room.bleed, styles.hero)}>
      <SceneCrossfade scenes={scenes} />

      <div className={styles.panel}>
        <h1 className={styles.title}>{t('HOME_SCENE_TITLE', { shop: APP_NAME })}</h1>
      </div>

      <div className={styles.buttons}>
        <Link href={sectionHref(SECTION_IDS.showroom)} className={styles.cta}>
          {t('HOME_SCENE_READ')}
        </Link>
      </div>

      {/* A small ad like in the local paper: the only place the site talks about the fee. */}
      <div className={styles.advertise}>
        <div className={styles.advertiseWords}>
          <p className={styles.advertiseTitle}>{order}</p>
          {orderText && <p className={styles.advertiseText}>{orderText}</p>}
        </div>
        <Link
          href={whatsappUrl ?? sectionHref(SECTION_IDS.contact)}
          {...(whatsappUrl && { target: '_blank', rel: 'noopener noreferrer' })}
          className={styles.advertiseButton}
        >
          {whatsappUrl && <WhatsAppLogo />}
          {t('HOME_HERO_ORDER_BUTTON')}
        </Link>
      </div>
    </section>
  );
}
