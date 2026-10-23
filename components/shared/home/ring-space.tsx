import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import GenieLamp from '@/components/shared/genie-lamp';
import { BRAND } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import type { SpaceRing } from './ring-space-field';
import { SECTION_IDS, sectionHref } from './one-page';
import PalmSilhouette from './palm-silhouette';
import RingSpaceStage from './ring-space-stage';
import room from './dark-room.module.css';
import styles from './ring-space.module.css';

interface RingSpaceProps {
  rings: SpaceRing[];
}

/** Home opening: the cut-out rings float in a volcanic night around the title. */
export default async function RingSpace({ rings }: RingSpaceProps) {
  const { t } = await getT();

  return (
    <section className={cn(room.bleed, styles.space)}>
      <div className={styles.embers} aria-hidden='true' />
      {/* The lamp belongs to the opening only; in the fixed background it showed behind every part's text. */}
      {BRAND.hasGoldLeafBackground && <GenieLamp className={styles.lamp} image={BRAND.lampImage} spout={BRAND.lampSpout} />}
      {/* Evening on a volcanic island: the volcano with its glowing crater, and palms standing in front of the light. */}
      <svg className={styles.land} viewBox='0 0 1440 400' preserveAspectRatio='xMidYMax slice' aria-hidden='true'>
        <defs>
          {/* A gradient instead of a blur: the browser clips blur at a box around the shape, which showed as a hard rectangle. */}
          <radialGradient id='ring-space-crater'>
            <stop offset='0' className={styles.craterCore} />
            <stop offset='1' className={styles.craterEdge} />
          </radialGradient>
          <g id='ring-space-tree'>
            <PalmSilhouette />
          </g>
        </defs>
        <ellipse className={styles.crater} cx='700' cy='130' rx='280' ry='122' fill='url(#ring-space-crater)' />
        <path
          className={styles.volcano}
          d='M0 400 V300 L200 272 L420 240 L600 150 L660 120 L700 136 L740 118 L820 170 L1000 250 L1200 282 L1440 262 V400 Z'
        />
        <path className={styles.ridge} d='M0 400 V332 C200 302 350 342 520 322 S900 300 1100 332 S1350 302 1440 322 V400 Z' />
        <g className={styles.trees}>
          <use href='#ring-space-tree' transform='translate(150 372) scale(1.9)' />
          <use href='#ring-space-tree' transform='translate(318 366) scale(-1.2 1.2)' />
          <use href='#ring-space-tree' transform='translate(1090 368) scale(1.5)' />
          <use href='#ring-space-tree' transform='translate(1262 374) scale(-2.1 2.1)' />
          <use href='#ring-space-tree' transform='translate(1372 362) scale(1.1)' />
          <path d='M0 400 V366 C300 350 600 380 900 362 S1300 372 1440 358 V400 Z' />
        </g>
      </svg>
      <RingSpaceStage rings={rings} />

      <div className={styles.center}>
        {/* The scene speaks for itself; the heading stays for screen readers and search engines. */}
        <h1 className='sr-only'>
          {[t('HOME_HERO_WORD_1'), t('HOME_HERO_WORD_2'), t('HOME_HERO_WORD_3')].join(', ')}
        </h1>
        {/* Points down: the store is the next part of the page. */}
        <Link href={sectionHref(SECTION_IDS.showroom)} className={room.action}>
          {t('HOME_HERO_CTA')}
          <ChevronDown className='size-4 motion-safe:animate-bounce' />
        </Link>
      </div>
    </section>
  );
}
