import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { APP_NAME } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { LISTING_FROM_PRICE } from '@/lib/marketplace/config';
import { cn } from '@/lib/utils';
import { WhatsAppLogo } from './dark-room-hero';
import SlideLink from '@/components/shared/slide-link';
import { SECTION_IDS, sectionHref } from './one-page';
import room from './dark-room.module.css';
import { type HeroPicture, heroAltKey } from './hero-pictures';
import SceneCrossfade from './scene-crossfade';
import styles from './scene-hero.module.css';

interface SceneHeroProps {
  pictures: HeroPicture[];
  /** The first listing of the swipe-through feed; without it there is no feed button. */
  feedHref?: string;
}

/** The opening screen: a full-screen island picture of the goat, a small title and the ways into the listings. */
export default async function SceneHero({ pictures, feedHref }: SceneHeroProps) {
  const { t } = await getT();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;
  const order = t('HOME_HERO_ORDER', { price: LISTING_FROM_PRICE });
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
        <div className={styles.buttons}>
          <Button asChild size='lg' className={cn('rounded-full', styles.solid)}>
            <SlideLink href='/explore' direction='down' readySelector='[data-feed-page]'>
              <Newspaper aria-hidden />
              {t('HOME_SCENE_READ')}
            </SlideLink>
          </Button>
          <Button asChild size='lg' variant='outline' className={cn('rounded-full', styles.glass)}>
            <Link href={sectionHref(SECTION_IDS.showroom)}>{t('HOME_SCENE_CATEGORIES')}</Link>
          </Button>
          {feedHref && (
            <Button asChild size='lg' variant='outline' className={cn('rounded-full', styles.glass)}>
              <Link href={feedHref}>{t('HOME_SCENE_FEED')}</Link>
            </Button>
          )}
        </div>
      </div>

      <Link
        href={whatsappUrl ?? sectionHref(SECTION_IDS.contact)}
        {...(whatsappUrl && { target: '_blank', rel: 'noopener noreferrer' })}
        className={styles.advertise}
      >
        {whatsappUrl && <WhatsAppLogo />}
        {order}
      </Link>
    </section>
  );
}
