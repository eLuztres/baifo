'use client';

import { CSSProperties, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import type { MaterialRing } from '@/components/shared/home/materials';
import type { CategoryRingAdmin } from '@/lib/category';
import { cn } from '@/lib/utils';
import ConcaveRingRow from './concave-ring-row';
import { GoldBand, GoldEngraving } from './product-ring';
import styles from './product-ring.module.css';
import { useNeighbourSpots } from './use-neighbour-spots';
import { useRingDrag } from './use-ring-drag';

export interface RingCategory {
  id: string;
  name: string;
  text: string;
  image: string;
  products: MaterialRing[];
}

export interface RingFigure {
  image: string;
  /** Turns about the picture's middle a little with every turn of the ring, like a windmill's sails. */
  spinner?: string;
  /** Where its foot stands on the center picture, as shares of its width and height. */
  at: { x: number; y: number };
  /** Its width as a share of the center picture's (default 0.3). */
  scale?: number;
}

interface CategoryRingProps {
  categories: RingCategory[];
  label: string;
  /** What turns in the ring's middle: 'band' (the gold band), 'none', or a picture's URL shown as a 3D piece. */
  center?: string;
  /** A picture lying under the center picture, three times its size. */
  sea?: string;
  /** A small picture flying in loops above the center picture. */
  flyer?: string;
  /** Pictures standing on the center picture. */
  figures?: RingFigure[];
  /** Only for admins: edit rings right here (categories are edited in the admin catalog). */
  admin?: CategoryRingAdmin;
}

// Loaded only when an admin looks, so visitors never download the editors.
const RingTileActions = dynamic(() => import('@/components/admin/category-admin/ring-tile-actions'));
const AddRingTile = dynamic(() => import('@/components/admin/category-admin/add-ring-tile'));

// Few categories repeat around the ring, so neighbours always show left and right of the front one.
const MIN_RING_CARDS = 6;
// Big screens show two cards on each side of the front one, which takes a ring of smaller steps.
const MIN_WIDE_RING_CARDS = 16;
// The width where the ring reaches the screen edges (product-ring.module.css).
const WIDE_SCREEN_QUERY = '(min-width: 1024px)';
const TURN_MS = 1400;
// The arrows on the neighbour cards show once the cards are nearly in place (about two thirds into the turn's
// soft curve), and take their exact place once the ring has settled (a turn, or the 1.4s entrance on load).
const ARROWS_APPEAR_MS = 900;
const SETTLE_MS = 1400;
// Copies of the center picture stacked below it give it its thickness.
const PIECE_LAYERS = 10;
const FLYER_COUNT = 3;
// The home page's search param with the category in front, e.g. from a listing's way back.
const CATEGORY_PARAM = 'category';

const mod = (value: number, length: number) => ((value % length) + length) % length;

const subscribeToWideScreen = (onChange: () => void) => {
  const query = window.matchMedia(WIDE_SCREEN_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const isWideScreen = () => window.matchMedia(WIDE_SCREEN_QUERY).matches;
const isWideOnServer = () => false;

interface CenterPieceProps {
  src: string;
  sea?: string;
}

/** A picture lying in the ring's middle with some thickness, turning along with the cards. */
const CenterPiece = ({ src, sea }: CenterPieceProps) => (
  <div className={styles.centerPiece} style={{ '--piece': `url("${src}")` } as CSSProperties} aria-hidden='true'>
    {!sea && <span className={styles.pieceGlow} />}
    {Array.from({ length: PIECE_LAYERS }, (_, index) => (
      <span key={index} className={styles.pieceSide} style={{ '--layer': index / PIECE_LAYERS } as CSSProperties} />
    ))}
    <span className={styles.pieceTop} />
  </div>
);

interface FiguresProps {
  figures: RingFigure[];
}

/** The pictures standing on the center piece, in the cards' scene, so the cards in front hide them (boats never sail over a card). */
const Figures = ({ figures }: FiguresProps) => (
  <div className={styles.centerPiece} aria-hidden='true'>
    {figures.map((figure) => (
      <span
        key={`${figure.image}@${figure.at.x},${figure.at.y}`}
        className={styles.pieceFigure}
        style={
          {
            '--figure': `url("${figure.image}")`,
            '--figure-scale': figure.scale,
            left: `${figure.at.x * 100}%`,
            top: `${figure.at.y * 100}%`,
          } as CSSProperties
        }
      >
        {figure.spinner && <span className={styles.figureSpinner} style={{ '--spinner': `url("${figure.spinner}")` } as CSSProperties} />}
      </span>
    ))}
  </div>
);

interface SeaProps {
  src: string;
}

/** The sea under the center piece, turning with it in a scene of its own behind the cards: in the cards' scene its
    near edge would cut through the front card. */
const Sea = ({ src }: SeaProps) => (
  <div className={styles.tilt} aria-hidden='true'>
    <div className={styles.centerPiece}>
      <span className={styles.pieceSea} style={{ '--sea': `url("${src}")` } as CSSProperties} />
    </div>
  </div>
);

interface FlyersProps {
  src: string;
}

/** A few copies of a picture looping above the center piece, each on its own path and pace. */
const Flyers = ({ src }: FlyersProps) => (
  <div className={styles.flyers} style={{ '--flyer': `url("${src}")` } as CSSProperties} aria-hidden='true'>
    {Array.from({ length: FLYER_COUNT }, (_, index) => (
      <span key={index} className={styles.flyerPath} style={{ '--flyer-i': index } as CSSProperties}>
        <span className={styles.flyer} />
      </span>
    ))}
  </div>
);

/** The store's opening: one card per material, each opening the rings made of it. */
const CategoryRing = ({ categories, label, center = 'band', sea, flyer, figures = [], admin }: CategoryRingProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // From the live URL, not a server prop: the back button restores the first server render, not the category turned to since.
  const initialCategoryId = useSearchParams().get(CATEGORY_PARAM);
  const [step, setStep] = useState(() => Math.max(0, categories.findIndex((category) => category.id === initialCategoryId)));
  const { t } = useI18n();
  const isWide = useSyncExternalStore(subscribeToWideScreen, isWideScreen, isWideOnServer);

  const count = categories.length * Math.ceil((isWide ? MIN_WIDE_RING_CARDS : MIN_RING_CARDS) / categories.length);
  const stepAngle = 360 / count;
  const frontIndex = mod(step, count);
  const front = categories[frontIndex % categories.length];
  const frontAdminCategory = admin?.categories.find((category) => category.slug === front.id);
  // Ring radius per unit of card spacing for this many cards; the spacing itself grows with the screen (CSS).
  const ringTan = 1 / (2 * Math.tan(Math.PI / count));
  const hasPiece = center !== 'band' && center !== 'none';
  const dragHandlers = useRingDrag({ setStep });
  const neighbourSpots = useNeighbourSpots(stageRef, frontIndex, count, ARROWS_APPEAR_MS, SETTLE_MS);

  // The front category goes into the URL, so the back button and shared links return to it. A fresh visit keeps a clean URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    if ((url.searchParams.get(CATEGORY_PARAM) ?? categories[0].id) === front.id) return;
    url.searchParams.set(CATEGORY_PARAM, front.id);
    window.history.replaceState(null, '', url);
  }, [front.id, categories]);

  // A card at the side turns to the front; the front card opens its category as a grid.
  const handleCardClick = (index: number) => {
    const offset = mod(index - frontIndex + Math.floor(count / 2), count) - Math.floor(count / 2);
    if (offset === 0) router.push(`/category/${front.id}`);
    else setStep((current) => current + offset);
  };

  return (
    // data-swipe-owner: sideways swipes here browse the categories and rings, never turn the page to another part.
    <section className={cn('flex min-h-0 flex-1 flex-col justify-center gap-4', styles.categorySection)} data-swipe-owner=''>
      <div
        ref={stageRef}
        role='region'
        aria-label={label}
        className={cn(styles.stage, styles.categoryStage, hasPiece && styles.pieceStage)}
        {...dragHandlers}
        style={
          {
            '--ring-tan': ringTan,
            '--spin': -step / count,
            '--turn-ms': `${TURN_MS}ms`,
          } as CSSProperties
        }
      >
        {/* The band is a scene of its own behind the cards, so the vine laid over it never fights it over which face shows. */}
        {center === 'band' && (
          <div className={styles.tilt}>
            <GoldBand className={styles.centerBand} />
          </div>
        )}
        {hasPiece && sea && <Sea src={sea} />}
        <div className={styles.tilt}>
          {center === 'band' && <GoldEngraving className={cn(styles.centerBand, styles.turning)} />}
          {hasPiece && <CenterPiece src={center} sea={sea} />}
          {hasPiece && figures.length > 0 && <Figures figures={figures} />}
          {hasPiece && flyer && <Flyers src={flyer} />}
          <ul className={cn(styles.ring, styles.turning)}>
            {Array.from({ length: count }, (_, index) => {
              const category = categories[index % categories.length];
              return (
                <li
                  key={index}
                  className={styles.slot}
                  style={{ '--angle': `${index * stepAngle}deg`, '--index': index } as CSSProperties}
                >
                  <button
                    type='button'
                    className={styles.card}
                    aria-current={index === frontIndex || undefined}
                    tabIndex={index < categories.length ? 0 : -1}
                    onClick={() => handleCardClick(index)}
                  >
                    <div className={styles.glassCard}>
                      <ProductMedia src={category.image} alt={category.name} fill sizes='16rem' />
                      <span className={styles.glass} />
                    </div>
                    <p className={styles.caption}>
                      <span className={styles.captionName}>{category.name}</span>
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {/* An arrow on each neighbour card, so it's clear that tapping there turns the ring. */}
        {neighbourSpots.map(({ offset, x, y }) => (
          <button
            key={offset}
            type='button'
            className={styles.turnHint}
            style={{ left: x, top: y }}
            aria-label={t(offset === -1 ? 'STORE_CATEGORY_PREVIOUS' : 'STORE_CATEGORY_NEXT')}
            onClick={() => setStep((current) => current + offset)}
          >
            {offset === -1 ? <ChevronLeft /> : <ChevronRight />}
          </button>
        ))}
      </div>

      {/* The rings of the front category on a second ring below, curved the other way; keyed, so a new category starts at its first ring. */}
      <ConcaveRingRow
        key={front.id}
        products={front.products}
        categoryId={front.id}
        renderActions={
          admin && ((product) => <RingTileActions productId={product.id} name={product.name} ringIds={front.products.map((ring) => ring.id)} />)
        }
        addTile={admin && frontAdminCategory && <AddRingTile href={admin.addProductHrefs[frontAdminCategory.id]} name={front.name} />}
      />

      {/* The name already shows under the front card; a fixed height keeps the banner from jumping. */}
      <div className='mx-auto flex h-14 max-w-2xl shrink-0 flex-col items-center justify-start gap-1 px-4 text-center' aria-live='polite'>
        <p className='sr-only'>{front.name}</p>
        <p className='line-clamp-2 text-balance text-sm leading-5 text-muted-foreground'>{front.text}</p>
        <Link
          href={`/explore?c=${front.id}`}
          className='inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium text-primary underline-offset-4 hover:underline'
        >
          {t('CATEGORY_SEE_ALL')} <ChevronRight className='size-3.5' aria-hidden />
        </Link>
      </div>
    </section>
  );
};

export default CategoryRing;
