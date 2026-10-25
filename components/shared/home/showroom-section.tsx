import CategoryRing from '@/components/shared/product/category-ring';
import CategoryToolbar from '@/components/admin/category-admin/category-toolbar';
import { groupByCategory } from '@/components/shared/home/materials';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { showsAdminTools } from '@/lib/auth-guard';
import { BRAND } from '@/lib/brand';
import { toRingAdmin } from '@/lib/category-admin';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import type { CollectionRing } from './in-stock-rings';
import { SECTION_IDS } from './one-page';
import styles from './one-page.module.css';

interface ShowroomSectionProps {
  /** The rings in stock, in the store's order (fetched once by the home page). */
  rings: CollectionRing[];
  /** A category to show first, from old `/store?material=…` links. */
  material?: string;
}

/** The exposition: the category ring with the rings of the category in front. */
export default async function ShowroomSection({ rings, material }: ShowroomSectionProps) {
  const [{ t, locale }, storeCategories, isAdminUser] = await Promise.all([getT(), getStoreCategories(), showsAdminTools()]);
  // Admins also see empty categories, so they can fill them.
  const groups = groupByCategory(storeCategories, rings, locale, isAdminUser);
  const images = new Map(storeCategories.map((category) => [category.slug, category.image]));
  // A category without a cover shows its newest ring.
  const categories = groups.map((group) => ({
    ...group,
    image: images.get(group.id) ?? group.rings[0]?.image ?? BRAND.heroImage,
    products: group.rings,
  }));
  const admin = isAdminUser ? toRingAdmin(storeCategories, rings) : undefined;
  const figure = BRAND.ringFigure && { image: BRAND.ringFigure, spinner: BRAND.ringFigureSpinner, at: BRAND.ringFigureAt };

  return (
    <section id={SECTION_IDS.showroom} className={cn('relative', styles.section, styles.fitScreen, styles.noVerticalPan)}>
      <h2 className='sr-only'>{t('NAV_SHOWROOM')}</h2>
      {categories.length > 0 ? (
        <CategoryRing categories={categories} label={t('RING_TITLE')} initialCategoryId={material} center={BRAND.ringCenter} figure={figure || undefined} admin={admin} />
      ) : (
        <div className='space-y-4'>
          {admin && <CategoryToolbar admin={admin} />}
          <p className='rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground'>
            {t('STORE_EMPTY')}
          </p>
        </div>
      )}
    </section>
  );
}
