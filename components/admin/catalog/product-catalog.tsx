import { getCatalogRings, getStoreCategories, getSubcategories } from '@/lib/actions/category.actions';
import SubcategoryList from '@/components/admin/service/subcategory-list';
import { ChevronDown } from 'lucide-react';
import type { LocalizedText } from '@/lib/category';
import CategoryToolbar from '@/components/admin/category-admin/category-toolbar';
import AddRingTile from '@/components/admin/category-admin/add-ring-tile';
import { localize } from '@/lib/category';
import { newProductPathFor } from '@/lib/constants';
import { toRingAdmin } from '@/lib/category-admin';
import { getT } from '@/lib/i18n-server';
import { isReservationActive } from '@/lib/reservation';
import CategoryTree from './category-tree';
import CatalogRingCard from './catalog-ring-card';
import CategoryListingsPicker from './category-listings-picker';
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
    listingId: ring.submission?.id,
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
  const subcategories = selected?.categoryId ? await getSubcategories(selected.slug) : [];

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
          {/* Closed by default: renaming or adding a subcategory is rare next to managing the products. */}
          {selected?.categoryId && (
            <details key={selected.categoryId} className='group rounded-2xl border border-border bg-card/60 p-3'>
              <summary className='flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium'>
                {t('CATALOG_SUBCATEGORIES', { count: subcategories.length })}
                <ChevronDown className='size-4 transition-transform group-open:rotate-180' aria-hidden />
              </summary>
              <div className='mt-3 space-y-3'>
                <p className='text-xs text-muted-foreground'>{t('CATALOG_SUBCATEGORIES_HINT')}</p>
                <SubcategoryList
                  parentSlug={selected.slug}
                  locales={admin.locales}
                  subcategories={subcategories.map(({ id, name }) => ({ id, name: name as LocalizedText }))}
                  newLabel={t('CATALOG_SUBCATEGORY_NEW')}
                />
              </div>
            </details>
          )}
          <div className='flex flex-wrap items-center gap-2'>
            <CategoryToolbar
              admin={admin}
              frontSlug={selected?.slug === UNCATEGORIZED ? undefined : selected?.slug}
              className='justify-start px-0'
            />
            {selected?.categoryId && (
              <CategoryListingsPicker
                key={selected.categoryId}
                categoryId={selected.categoryId}
                categoryName={selected.name}
                listings={rings.map((ring) => ({
                  id: ring.id,
                  name: ring.name,
                  image: ring.images[0],
                  isService: ring.kind === 'service',
                  categoryIds: ring.categoryIds,
                }))}
              />
            )}
          </div>
          <ul className='grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4'>
            {selected?.categoryId && (
              <li className='aspect-[4/5]'>
                <AddRingTile href={newProductPathFor({ id: selected.categoryId, slug: selected.slug })} name={selected.name} />
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
