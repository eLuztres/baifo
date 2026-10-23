import { getCatalogRings, getStoreCategories } from '@/lib/actions/category.actions';
import CategoryToolbar from '@/components/admin/category-admin/category-toolbar';
import AddRingTile from '@/components/admin/category-admin/add-ring-tile';
import { localize } from '@/lib/category';
import { toRingAdmin } from '@/lib/category-admin';
import { getT } from '@/lib/i18n-server';
import { isReservationActive } from '@/lib/reservation';
import CategoryTree from './category-tree';
import CatalogRingCard from './catalog-ring-card';
import { UNCATEGORIZED, type CatalogBranch } from './catalog-types';

interface ProductCatalogProps {
  /** The category to show, by slug; the first one when missing. */
  selectedSlug?: string;
}

/** The admin's products as a tree of categories beside the open category's rings, with its editors. */
const ProductCatalog = async ({ selectedSlug }: ProductCatalogProps) => {
  const [{ t, locale }, categories, products] = await Promise.all([getT(), getStoreCategories(), getCatalogRings()]);
  const rings = products.map((product) => ({ ...product, categoryIds: product.categories.map((category) => category.id) }));
  const nameOf = new Map(categories.map((category) => [category.id, localize(category.name, locale)]));

  const toCard = (ring: (typeof rings)[number], categoryId: string) => ({
    id: ring.id,
    name: ring.name,
    images: ring.images,
    price: ring.price,
    isSoldOut: ring.stock <= 0,
    isReserved: ring.stock > 0 && isReservationActive(ring),
    otherCategories: ring.categoryIds.filter((id) => id !== categoryId).map((id) => nameOf.get(id) ?? ''),
  });

  const branches: CatalogBranch[] = categories.map((category) => ({
    slug: category.slug,
    categoryId: category.id,
    name: localize(category.name, locale),
    text: localize(category.text, locale),
    image: category.image,
    rings: rings.filter((ring) => ring.categoryIds.includes(category.id)).map((ring) => toCard(ring, category.id)),
  }));
  const loose = rings.filter((ring) => ring.categoryIds.length === 0);
  if (loose.length > 0) {
    branches.push({
      slug: UNCATEGORIZED,
      categoryId: '',
      name: t('CATALOG_UNCATEGORIZED'),
      text: t('CATALOG_UNCATEGORIZED_TEXT'),
      image: null,
      rings: loose.map((ring) => toCard(ring, '')),
    });
  }

  const selected = branches.find((branch) => branch.slug === selectedSlug) ?? branches[0];
  const admin = toRingAdmin(categories, rings);

  return (
    <div className='space-y-6'>
      <h1 className='h2-bold'>{t('ADMIN_PRODUCTS')}</h1>
      <div className='grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]'>
        <aside className='space-y-3 lg:sticky lg:top-6 lg:self-start'>
          <p className='px-2 text-xs uppercase tracking-[0.2em] text-muted-foreground'>{t('CATALOG_CATEGORIES')}</p>
          <CategoryTree branches={branches} selectedSlug={selected?.slug ?? ''} label={t('CATALOG_CATEGORIES')} />
        </aside>

        <section className='min-w-0 space-y-5'>
          {selected && (
            <div className='space-y-2'>
              <h2 className='font-display text-2xl sm:text-3xl'>{selected.name}</h2>
              {selected.text && <p className='max-w-2xl text-sm text-muted-foreground'>{selected.text}</p>}
              <p className='text-xs uppercase tracking-[0.2em] text-primary'>{t('STORE_CATEGORY_RINGS', { count: selected.rings.length })}</p>
            </div>
          )}
          <CategoryToolbar
            admin={admin}
            frontSlug={selected?.slug === UNCATEGORIZED ? undefined : selected?.slug}
            className='justify-start px-0'
          />
          <ul className='grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4'>
            {selected?.categoryId && (
              <li className='aspect-[4/5]'>
                <AddRingTile categoryId={selected.categoryId} name={selected.name} />
              </li>
            )}
            {selected?.rings.map((ring) => (
              <li key={ring.id}>
                <CatalogRingCard
                  ring={ring}
                  ringIds={selected.rings.map((item) => item.id)}
                  soldOutLabel={t('SOLD_OUT')} reservedLabel={t('RESERVE_BADGE')} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default ProductCatalog;
