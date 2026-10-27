'use client';

import { CSSProperties, Dispatch, MouseEvent, ReactNode, SetStateAction, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import type { MaterialRing } from '@/components/shared/home/materials';
import { isClearlyVertical } from '@/components/shared/home/one-page';
import { cn } from '@/lib/utils';
import styles from './product-ring.module.css';

interface ConcaveRingRowProps {
  products: MaterialRing[];
  /** The category the rings are shown in; the product page turns on to the next ring of it. */
  categoryId: string;
  /** Admins' edit buttons on a ring's tile. */
  renderActions?: (product: MaterialRing) => ReactNode;
  /** Admins' tile for adding a ring, after the last one. */
  addTile?: ReactNode;
}

interface BannerTileProps {
  product: MaterialRing;
  categoryId: string;
}

// The same soft turn as the category ring above (product-ring.module.css --turn-ease).
const TURN_MS = 1400;
// Spots on the ring; fewer rings leave the rest empty and the ring stops at its ends instead of turning round.
const MIN_SLOTS = 12;
// Rings further round than this from the front one stay empty slots: they're faded out anyway, and iPhone Safari
// left photos unpainted with every ring of a category built as a 3D layer at once.
const BUILT_SIDE_RINGS = 3;
// A mouse wheel turns one ring per notch, not one per event of a fast spin.
const WHEEL_PAUSE_MS = 450;
// A new category's rings enter one after another; past this many they come together, so long rows don't drag.
const MAX_STAGGERED_TILES = 6;
// The tiles' photo size; the preloader asks for the same one, so the tiles find their photos in the browser's cache.
const TILE_SIZES = '16rem';
const TURN_BUTTON_CLASS =
  'size-10 rounded-full border-primary/40 bg-background/50 text-primary shadow-lg backdrop-blur-md hover:border-primary hover:bg-background/70 [&_svg]:size-5';

const mod = (value: number, length: number) => ((value % length) + length) % length;

/** One ring in the row under the selector: only its photo; the front ring's name shows below the row. */
const BannerTile = ({ product, categoryId }: BannerTileProps) => {
  const { t } = useI18n();

  return (
    <Link
      href={`/product/${product.slug}?c=${categoryId}`}
      className='group relative block size-full overflow-hidden rounded-2xl border border-border bg-muted transition hover:border-primary/60'
      draggable={false}
    >
      <ProductMedia
        src={product.image}
        alt={product.name}
        fill
        sizes={TILE_SIZES}
        className='transition-transform duration-500 ease-out group-hover:scale-105'
      />
      {/* The store only lists rings in stock, so a reservation is the only badge a tile can carry. */}
      {product.isReserved && (
        <span className='absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur'>
          {t('RESERVE_BADGE')}
        </span>
      )}
    </Link>
  );
};

/**
 * The front category's rings on a ring seen from the inside: it turns like the category ring above, but curves the
 * other way (concave), so the rings beside the front one come toward the viewer and face the middle.
 */
const ConcaveRingRow = ({ products, categoryId, renderActions, addTile }: ConcaveRingRowProps) => {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const tiles = [
    ...products.map((product) => ({ key: product.slug, content: <BannerTile product={product} categoryId={categoryId} />, product })),
    ...(addTile ? [{ key: 'add', content: addTile, product: undefined }] : []),
  ];
  const count = Math.max(tiles.length, MIN_SLOTS);
  const isEndless = tiles.length >= MIN_SLOTS;
  // A short row starts on its middle ring, so rings show on both sides.
  const [step, setRawStep] = useState(() => (isEndless ? 0 : Math.floor((tiles.length - 1) / 2)));
  const stepAngle = 360 / count;
  const ringTan = 1 / (2 * Math.tan(Math.PI / count));
  const frontIndex = mod(step, count);
  const hasBefore = isEndless || step > 0;
  const hasAfter = isEndless || step < tiles.length - 1;
  const frontProduct = tiles[frontIndex]?.product;

  // A short ring stops at its first and last ring.
  const setStep: Dispatch<SetStateAction<number>> = (update) =>
    setRawStep((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      return isEndless ? next : Math.min(Math.max(next, 0), tiles.length - 1);
    });
  // How many rings a tile is from the front one, negative on the left.
  const offsetFromFront = (index: number) =>
    isEndless ? mod(index - frontIndex + Math.floor(count / 2), count) - Math.floor(count / 2) : index - step;

  // A ring beside the front one turns to the front first; only the front ring opens its page.
  const handleTileClick = (event: MouseEvent, index: number) => {
    if (index === frontIndex) return;
    event.preventDefault();
    event.stopPropagation();
    const offset = offsetFromFront(index);
    setStep((current) => current + offset);
  };

  // A mouse wheel only scrolls up and down: over the rings it turns them, and turns the page once at the last one.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let pausedUntil = 0;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || !isClearlyVertical(event.deltaX, event.deltaY)) return;
      const direction = Math.sign(event.deltaY);
      if (!(direction > 0 ? hasAfter : hasBefore)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.timeStamp < pausedUntil) return;
      pausedUntil = event.timeStamp + WHEEL_PAUSE_MS;
      setRawStep((current) => current + direction);
    };
    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [hasBefore, hasAfter]);

  return (
    <>
      <div className={styles.bannerFrame}>
        <div
          ref={stageRef}
          className={styles.rowStage}
          style={{ '--ring-tan': ringTan, '--spin': step / count, '--turn-ms': `${TURN_MS}ms` } as CSSProperties}
        >
          <div className={styles.rowTilt}>
            <ul className={cn(styles.rowRing, styles.turning)}>
              {tiles.map((tile, index) => (
                <li
                  key={tile.key}
                  className={styles.rowSlot}
                  // Negative, so the next ring sits on the right on a ring seen from the inside.
                  style={{ '--angle': `${-index * stepAngle}deg` } as CSSProperties}
                  aria-current={index === frontIndex || undefined}
                >
                  {Math.abs(offsetFromFront(index)) <= BUILT_SIDE_RINGS && (
                    <div className={styles.rowCard} style={{ '--tile': Math.min(index, MAX_STAGGERED_TILES) } as CSSProperties}>
                      <div className={styles.rowFocus} onClickCapture={(event) => handleTileClick(event, index)}>
                        {tile.content}
                        {tile.product && renderActions?.(tile.product)}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Only the rings near the front are built, so every photo of the category loads here right away instead. */}
        <div className='hidden' aria-hidden>
          {products.map((product) => (
            <ProductMedia key={product.slug} src={product.image} fill sizes={TILE_SIZES} loading='eager' />
          ))}
        </div>
        {hasBefore && (
          <Button
            variant='outline'
            size='icon'
            className={cn(TURN_BUTTON_CLASS, 'absolute left-0 top-1/2 z-10 -translate-y-1/2 lg:left-[calc(50%-50vw+1.5rem)]')}
            aria-label={t('STORE_RINGS_PREVIOUS')}
            onClick={() => setStep((current) => current - 1)}
          >
            <ChevronLeft />
          </Button>
        )}
        {hasAfter && (
          <Button
            variant='outline'
            size='icon'
            className={cn(TURN_BUTTON_CLASS, 'absolute right-0 top-1/2 z-10 -translate-y-1/2 lg:right-[calc(50%-50vw+1.5rem)]')}
            aria-label={t('STORE_RINGS_NEXT')}
            onClick={() => setStep((current) => current + 1)}
          >
            <ChevronRight />
          </Button>
        )}
      </div>
      {/* A fixed height keeps the row from jumping; keyed, so each front ring's name fades in as its tile grows. */}
      <div className='flex h-8 shrink-0 items-center justify-center px-4' aria-live='polite'>
        {frontProduct && (
          <Link
            key={frontProduct.slug}
            href={`/product/${frontProduct.slug}?c=${categoryId}`}
            className='min-w-0 duration-500 animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards'
            style={{ animationDelay: `${TURN_MS * 0.6}ms` }}
          >
            <span className='block truncate font-display text-lg text-primary sm:text-xl'>{frontProduct.shortName}</span>
          </Link>
        )}
      </div>
    </>
  );
};

export default ConcaveRingRow;
