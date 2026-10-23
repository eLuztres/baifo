import PageHeader from '@/components/shared/page-header';
import { groupByCategory } from '@/components/shared/home/materials';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import CollectionTree from './collection-tree';
import type { CollectionRing } from './in-stock-rings';
import { SECTION_IDS } from './one-page';
import styles from './one-page.module.css';

interface ShopSectionProps {
  /** The rings in stock, in the store's order (fetched once by the home page). */
  rings: CollectionRing[];
}

/** The shop: every ring in the category tree. The tree is the only thing on the page that scrolls inside itself.
    Off the home page for now (showroom only); kept to be improved and brought back. */
export default async function ShopSection({ rings }: ShopSectionProps) {
  const [{ t, locale }, storeCategories] = await Promise.all([getT(), getStoreCategories()]);
  const groups = groupByCategory(storeCategories, rings, locale);
  const images = new Map(storeCategories.map((category) => [category.slug, category.image]));
  const ringImages = new Map(rings.map((ring) => [ring.id, ring.images]));

  return (
    <section id={SECTION_IDS.shop} className={cn('gap-4 sm:gap-6', styles.section, styles.fitScreen)}>
      <PageHeader as='h2' className='shrink-0' eyebrow={t('NAV_SHOP')} title={t('STORE_TREE_TITLE')} />
      {groups.length > 0 ? (
        <div
          data-scroll-owner
          className={cn(styles.fill, 'mx-auto w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-card/40 p-2')}
        >
          <CollectionTree groups={groups} images={images} ringImages={ringImages} title={t('STORE_TREE_TITLE')} />
        </div>
      ) : (
        <p className='rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground'>{t('STORE_EMPTY')}</p>
      )}
    </section>
  );
}
