import { BRAND } from '@/lib/brand';
import { APP_NAME } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { LISTING_FROM_PRICE } from '@/lib/marketplace/config';
import { localize } from '@/lib/localize';
import { getMercadillos } from '@/lib/mercadillos';
import { getScoutChoices } from '@/lib/scout-choices';
import { cn } from '@/lib/utils';
import SlideLink from '@/components/shared/slide-link';
import AdvertiseBox from './advertise-box';
import MercadilloSheet from './mercadillo-sheet';
import { SECTION_IDS, sectionHref } from './one-page';
import room from './dark-room.module.css';
import { type HeroPicture, heroAltKey, startAtRandom } from './hero-pictures';
import SceneCrossfade from './scene-crossfade';
import styles from './scene-hero.module.css';

interface SceneHeroProps {
  pictures: HeroPicture[];
}

/** The opening screen: a full-screen island picture of the goat, a small title and one way into the listings. */
export default async function SceneHero({ pictures }: SceneHeroProps) {
  const [{ t, locale }, mercadillos] = await Promise.all([getT(), getMercadillos()]);
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.sellWhatsappUrl(t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME })) : undefined;
  const scouts = whatsappUrl ? await getScoutChoices(t) : [];
  const order = t('HOME_HERO_ORDER', { price: LISTING_FROM_PRICE });
  const orderText = t('HOME_HERO_ORDER_TEXT');
  // An empty Mercadillo would open an empty page.
  const selections = mercadillos
    .filter((mercadillo) => mercadillo._count.products > 0)
    .map(({ slug, name, icon }) => ({ slug, name: localize(name, locale), icon }));
  // The shop's mark sits on the seam of the split button, the dark one in dark mode; without a mark, no seal.
  const sealMarks = [
    { src: BRAND.logoAnimated, className: BRAND.logoAnimatedDark ? 'dark:hidden' : undefined },
    { src: BRAND.logoAnimatedDark, className: BRAND.logoAnimated ? 'hidden dark:block' : undefined },
  ].filter((mark): mark is { src: string; className: string | undefined } => Boolean(mark.src));
  // The alt keys follow the file names, so a picture without its own text stays decorative instead of reading out the key.
  const scenes = startAtRandom(pictures).map(({ name, tall, wide, figure }) => {
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

      {/* One split button right under the title: the selections and the listings, half and half. */}
      <div className={styles.buttons}>
        <MercadilloSheet className={styles.secondary} label={t('HOME_SELECTIONS')} mercadillos={selections} />
        {/* prefetch: the whole listings page loads while home shows (also for the swipe down), not only its loading frame. */}
        <SlideLink href='/explore' prefetch direction='down' readySelector='[data-feed-page]' className={styles.cta}>
          {t('HOME_SCENE_READ')}
        </SlideLink>
        {selections.length > 0 && sealMarks.length > 0 && (
          <span className={styles.seal} aria-hidden>
            {/* "#still": the animated mark standing still, as in the header for "reduce motion". */}
            {sealMarks.map(({ src, className }) => (
              // eslint-disable-next-line @next/next/no-img-element -- a small SVG, shown as is
              <img key={src} src={`${src}#still`} alt='' width={40} height={40} className={className} />
            ))}
          </span>
        )}
      </div>

      {/* A small ad like in the local paper, at the bottom: the only place the site talks about the fee. */}
      <AdvertiseBox
        title={order}
        text={orderText}
        href={whatsappUrl ?? sectionHref(SECTION_IDS.contact)}
        scouts={scouts}
        shopName={APP_NAME}
      />
    </section>
  );
}
