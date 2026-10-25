import CategoryRing from '@/components/shared/product/category-ring';
import { groupByCategory } from '@/components/shared/home/materials';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { BRAND, RING_FIGURES } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import type { CollectionRing } from './in-stock-rings';
import { SECTION_IDS } from './one-page';
import styles from './one-page.module.css';

interface ShowroomSectionProps {
  /** The rings in stock, in the store's order (fetched once by the home page). */
  rings: CollectionRing[];
}

/** The exposition: the category ring with the rings of the category in front. */
export default async function ShowroomSection({ rings }: ShowroomSectionProps) {
  const [{ t, locale }, storeCategories] = await Promise.all([getT(), getStoreCategories()]);
  const groups = groupByCategory(storeCategories, rings, locale);
  const images = new Map(storeCategories.map((category) => [category.slug, category.image]));
  // A category without a cover shows its newest ring.
  const categories = groups.map((group) => ({
    ...group,
    image: images.get(group.id) ?? group.rings[0]?.image ?? BRAND.heroImage,
    products: group.rings,
  }));
  const figures = [
    ...(BRAND.ringFigure ? [{ image: BRAND.ringFigure, spinner: BRAND.ringFigureSpinner, at: BRAND.ringFigureAt }] : []),
    ...RING_FIGURES,
  ];

  return (
    <section id={SECTION_IDS.showroom} className={cn('relative', styles.section, styles.fitScreen, styles.noVerticalPan)}>
      <h2 className='sr-only'>{t('NAV_SHOWROOM')}</h2>
      {categories.length > 0 ? (
        <CategoryRing categories={categories} label={t('RING_TITLE')} center={BRAND.ringCenter} sea={BRAND.ringCenterSea} flyer={BRAND.ringFlyer} figures={figures} />
      ) : (
        <p className='rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground'>
          {t('STORE_EMPTY')}
        </p>
      )}
    </section>
  );
}
