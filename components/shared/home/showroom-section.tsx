import CategoryRing from '@/components/shared/product/category-ring';
import { groupByCategory, RING_PREVIEW_COUNT, type CategoryCount } from '@/components/shared/home/materials';
import type { StoreCategory } from '@/lib/actions/category.actions';
import { BRAND, RING_FIGURES, RING_FLYERS } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import type { CollectionRing } from './in-stock-rings';
import { SECTION_IDS } from './one-page';
import styles from './one-page.module.css';

interface ShowroomSectionProps {
  /** Each category's first few rings in stock, in the store's order (fetched once by the home page). */
  rings: CollectionRing[];
  /** Each category's counts by slug, from all its rings. */
  counts: Map<string, CategoryCount>;
  storeCategories: StoreCategory[];
}

/** The exposition: the category ring with the rings of the category in front. */
export default async function ShowroomSection({ rings, counts, storeCategories }: ShowroomSectionProps) {
  const { t, locale } = await getT();
  const groups = groupByCategory(storeCategories, rings, locale);
  const images = new Map(storeCategories.map((category) => [category.slug, category.image]));
  // A category without a cover shows its newest ring.
  const categories = groups.map((group) => ({
    ...group,
    image: images.get(group.id) ?? group.rings[0]?.image ?? BRAND.heroImage,
    // A ring loaded for another category (or the opening scene) can be in this one too, after its first few.
    products: group.rings.slice(0, RING_PREVIEW_COUNT),
    ...counts.get(group.id),
  }));
  const figures = [
    ...(BRAND.ringFigure ? [{ image: BRAND.ringFigure, spinner: BRAND.ringFigureSpinner, at: BRAND.ringFigureAt }] : []),
    ...RING_FIGURES,
  ];

  return (
    <section id={SECTION_IDS.showroom} className={cn('relative', styles.section, styles.fitScreen)}>
      <h2 className='sr-only'>{t('NAV_SHOWROOM')}</h2>
      {categories.length > 0 ? (
        <CategoryRing categories={categories} label={t('RING_TITLE')} center={BRAND.ringCenter} sea={BRAND.ringCenterSea} flyers={RING_FLYERS} figures={figures} />
      ) : (
        <p className='rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground'>
          {t('STORE_EMPTY')}
        </p>
      )}
    </section>
  );
}
