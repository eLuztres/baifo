import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { getProductBySlug } from '@/lib/actions/product.actions';
import ProductPrice from '@/components/shared/product/product-price';
import ProductImages from '@/components/shared/product/product-images';
import AddToCart from '@/components/shared/product/add-to-cart';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const [product, { t }] = await Promise.all([getProductBySlug(slug), getT()]);
  return { title: product?.name ?? t('PRODUCT_FALLBACK_TITLE') };
}

const ProductDetailsPage = async (props: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await props.params;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const cart = await getMyCart();
  const { t } = await getT();
  const inStock = product.stock > 0;
  const perks = [
    { icon: Truck, label: t('PRODUCT_PERK_SHIPPING') },
    { icon: ShieldCheck, label: t('PRODUCT_PERK_PAYMENT') },
    { icon: RotateCcw, label: t('PRODUCT_PERK_RETURNS') },
  ];

  return (
    <section className='space-y-8'>
      <Link
        href='/store'
        className='inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground'
      >
        <ChevronLeft className='h-4 w-4' />
        {t('BACK_TO_SHOP')}
      </Link>

      <div className='grid gap-10 lg:grid-cols-2 lg:gap-16'>
        <ProductImages images={product.images} alt={product.name} />

        <div className='flex flex-col gap-8'>
          <div className='space-y-4'>
            <p className='eyebrow'>
              {[product.brand, product.category].filter(Boolean).join(' · ')}
            </p>
            <h1 className='text-4xl leading-tight sm:text-5xl'>{product.name}</h1>
            <div className='flex items-center gap-4'>
              <ProductPrice value={Number(product.price)} className='text-3xl' />
              {inStock ? (
                <span className='inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300'>
                  <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                  {t('IN_STOCK')}
                </span>
              ) : (
                <span className='rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground'>
                  {t('SOLD_OUT')}
                </span>
              )}
            </div>
          </div>

          {inStock && (
            <div className='max-w-sm'>
              <AddToCart
                cart={cart}
                item={JSON.parse(JSON.stringify({
                  productId: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  qty: 1,
                  image: product.images![product["imageIndex"]],
                }))}
              />
            </div>
          )}

          <div className='space-y-3 border-t pt-8'>
            <h2 className='font-sans text-xs font-medium uppercase tracking-[0.3em] text-foreground/60'>
              {t('PRODUCT_DESCRIPTION')}
            </h2>
            <p className='whitespace-pre-line leading-7 text-foreground/85'>
              {product.description}
            </p>
          </div>

          <ul className='grid gap-3 border-t pt-8 text-sm text-muted-foreground'>
            {perks.map(({ icon: Icon, label }) => (
              <li key={label} className='flex items-center gap-3'>
                <Icon className='h-4 w-4 text-accent' strokeWidth={1.5} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailsPage;
