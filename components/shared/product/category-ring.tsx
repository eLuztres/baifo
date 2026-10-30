'use client';

import { CSSProperties, MouseEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import { RING_PREVIEW_COUNT, type MaterialRing } from '@/components/shared/home/materials';
import type { CategoryRingAdmin } from '@/lib/category';
import { cn } from '@/lib/utils';
import ConcaveRingRow from './concave-ring-row';
import { GoldBand, GoldEngraving } from './product-ring';
import styles from './product-ring.module.css';
import { useCaptionSpots } from './use-caption-spots';
import { useOpenFeed } from './use-open-feed';

export interface RingCategory {
  id: string;
  name: string;
  text: string;
  image: string;
  /** How many of its listings are new ("New: 3" under its card), a reason to turn the ring and to come back. */
  newCount?: number;
  products: MaterialRing[];
  /** All its listings when `products` holds only the first few (the home loads no more). */
  count?: number;
}

export interface RingFigure {
  image: string;
  /** Turns about the picture's middle a little with every turn of the ring, like a windmill's sails. */
  spinner?: string;
  /** Where its foot stands on the center picture, as shares of its width and height. */
  at: { x: number; y: number };
  /** Its width as a share of the center picture's (default 0.3). */
  scale?: number;
  /** Drifts slowly over the sea and bobs a little, like a boat. */
  drift?: boolean;
}

interface CategoryRingProps {
  categories: RingCategory[];
  label: string;
  /** What turns in the ring's middle: 'band' (the gold band), 'none', or a picture's URL shown as a 3D piece. */
  center?: string;
  /** A picture lying under the center picture, three times its size. */
  sea?: string;
  /** Small pictures flying in loops above the center picture; each copy takes the next one, so they don't fly alike. */
  flyers?: string[];
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
// The arrows beside the front card's name take their place once the ring has settled (a turn, or the 1.4s entrance on load).
const SETTLE_MS = 1400;
// Copies of the center picture stacked below it give it its thickness.
const PIECE_LAYERS = 16;
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

/** The pictures standing on the center piece, in a scene behind the cards, so the cards in front hide them (boats never sail over a card). */
const Figures = ({ figures }: FiguresProps) => (
  <div className={styles.centerPiece} aria-hidden='true'>
    {figures.map((figure, index) => (
      <span
        key={`${figure.image}@${figure.at.x},${figure.at.y}`}
        className={cn(styles.pieceFigure, figure.drift && styles.figureDrift)}
        style={
          {
            '--figure': `url("${figure.image}")`,
            '--drift-i': index,
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
  srcs: string[];
}

/** A few flyers looping above the center piece, each on its own path and pace. */
const Flyers = ({ srcs }: FlyersProps) => (
  <div className={styles.flyers} aria-hidden='true'>
    {Array.from({ length: FLYER_COUNT }, (_, index) => (
      <span key={index} className={styles.flyerPath} style={{ '--flyer-i': index, '--flyer': `url("${srcs[index % srcs.length]}")` } as CSSProperties}>
        <span className={styles.flyer} />
      </span>
    ))}
  </div>
);

/** The store's opening: one card per material, each opening the rings made of it. */
const CategoryRing = ({ categories, label, center = 'band', sea, flyers = [], figures = [], admin }: CategoryRingProps) => {
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
  const captionSpots = useCaptionSpots(stageRef, frontIndex, SETTLE_MS);
  const openFeed = useOpenFeed(stageRef);
  const feedHref = `/explore?c=${front.id}`;
  const rowProducts = front.products.slice(0, RING_PREVIEW_COUNT);
  const frontCount = front.count ?? front.products.length;

  // The feed of the front category is the likely next page: fetched ahead, so the morph into it doesn't wait.
  useEffect(() => router.prefetch(feedHref), [router, feedHref]);

  // The front category goes into the URL, so the back button and shared links return to it. A fresh visit keeps a clean URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    if ((url.searchParams.get(CATEGORY_PARAM) ?? categories[0].id) === front.id) return;
    url.searchParams.set(CATEGORY_PARAM, front.id);
    window.history.replaceState(null, '', url);
  }, [front.id, categories]);

  // A card at the side turns to the front; the front card opens its category's feed.
  const handleCardClick = (index: number) => {
    const offset = mod(index - frontIndex + Math.floor(count / 2), count) - Math.floor(count / 2);
    if (offset === 0) openFeed(feedHref);
    else setStep((current) => current + offset);
  };

  // A plain click morphs into the feed; a new-tab or middle click stays a normal link.
  const handleFeedLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openFeed(feedHref);
  };

  return (
    // data-swipe-owner: a sideways swipe here never turns the page to another part; the arrows and side cards turn the rings.
    <section className={cn('relative flex min-h-0 flex-1 flex-col justify-center gap-4', styles.categorySection)} data-swipe-owner=''>
      <div
        ref={stageRef}
        role='region'
        aria-label={label}
        className={cn(styles.stage, styles.categoryStage, hasPiece && styles.pieceStage)}
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
        {/* The piece and its figures are scenes of their own too: Safari sorts a figure behind the piece's top (it doesn't
            split planes), so boats on the far side vanished during a turn. The cards' scene comes later and covers both. */}
        {hasPiece && (
          <div className={styles.tilt}>
            <CenterPiece src={center} sea={sea} />
          </div>
        )}
        {hasPiece && figures.length > 0 && (
          <div className={styles.tilt}>
            <Figures figures={figures} />
          </div>
        )}
        <div className={styles.tilt}>
          {center === 'band' && <GoldEngraving className={cn(styles.centerBand, styles.turning)} />}
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
        {/* A scene of their own after the cards', so the gulls fly over the cards instead of behind them. */}
        {hasPiece && flyers.length > 0 && (
          <div className={styles.tilt}>
            <Flyers srcs={flyers} />
          </div>
        )}
      </div>
      {/* An arrow on each side of the front card's name; beside the stage, whose faded edges would hide them on a phone. */}
      {captionSpots.map(({ offset, x, y }) => (
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

      {/* The name already shows under the front card; this tells screen readers about a turn. */}
      <p className='sr-only' aria-live='polite'>
        {front.name}
      </p>

      {/* The rings of the front category on a second ring below, curved the other way; keyed, so a new category starts at its first ring. */}
      <ConcaveRingRow
        key={front.id}
        products={rowProducts}
        categoryId={front.id}
        renderActions={
          admin && ((product) => <RingTileActions productId={product.id} name={product.name} ringIds={front.products.map((ring) => ring.id)} />)
        }
        addTile={admin && frontAdminCategory && <AddRingTile href={admin.addProductHrefs[frontAdminCategory.id]} name={front.name} />}
        // Always there, even when all of them show: it leads into the feed, which runs on into the next categories.
        moreTile={
          <Link
            href={feedHref}
            onClick={handleFeedLinkClick}
            draggable={false}
            aria-label={t('CATEGORY_SEE_ALL_IN', { category: front.name, count: frontCount })}
            className='flex size-full items-center justify-center rounded-2xl border border-primary/40 bg-card text-primary transition hover:border-primary'
          >
            <Plus className='size-12' aria-hidden />
          </Link>
        }
      />
    </section>
  );
};

export default CategoryRing;
