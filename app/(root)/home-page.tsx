import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Headset, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductList from '@/components/shared/product/product-list';
import ProductCarousel from '@/components/shared/product/product-carousel';
import BrandLogo from '@/components/shared/brand-logo';
import { getFeaturedProducts, getLatestProducts } from '@/lib/actions/product.actions';
import { BRAND, hasContactInfo } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';

export default async function HomePage() {
  const { t } = await getT();
  const [latestProducts, featuredProducts] = await Promise.all([
    getLatestProducts(),
    getFeaturedProducts(),
  ]);
  const bannerProducts = featuredProducts.filter((product) => product.banner);

  const values = [
    { icon: Truck, title: t('VALUE_SHIPPING_TITLE'), body: t('VALUE_SHIPPING_DESCRIPTION') },
    { icon: ShieldCheck, title: t('VALUE_PAYMENT_TITLE'), body: t('VALUE_PAYMENT_DESCRIPTION') },
    { icon: RotateCcw, title: t('VALUE_RETURNS_TITLE'), body: t('VALUE_RETURNS_DESCRIPTION') },
    { icon: Headset, title: t('VALUE_SUPPORT_TITLE'), body: t('VALUE_SUPPORT_DESCRIPTION') },
  ];

  return (
    <div className='space-y-20 pb-8 sm:space-y-28'>
      {/* Hero */}
      <section className='grid gap-12 lg:grid-cols-2 lg:items-center'>
        <div className='space-y-6'>
          <p className='eyebrow'>{t('HERO_EYEBROW')}</p>
          <h1 className='text-4xl leading-tight sm:text-5xl lg:text-6xl'>
            {t('HERO_TITLE', { shop: BRAND.name })}
          </h1>
          <p className='max-w-xl text-lg leading-8 text-muted-foreground'>
            {t('BRAND_DESCRIPTION') || BRAND.description}
          </p>
          <div className='flex flex-wrap gap-3'>
            <Button asChild size='lg' className='rounded-full px-7'>
              <Link href='/store'>
                {t('HERO_CTA')}
                <ArrowRight />
              </Link>
            </Button>
            {hasContactInfo && (
              <Button asChild size='lg' variant='outline' className='rounded-full px-7'>
                <Link href='/contact'>{t('NAV_CONTACT')}</Link>
              </Button>
            )}
          </div>
        </div>

        <div className='relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/25 via-muted to-background'>
          {BRAND.heroImage ? (
            <Image
              src={BRAND.heroImage}
              alt=''
              fill
              priority
              unoptimized
              sizes='(min-width: 1024px) 50vw, 100vw'
              className='object-cover'
            />
          ) : (
            <div className='flex-center h-full'>
              <BrandLogo className='h-32 w-auto opacity-90 sm:h-40' />
            </div>
          )}
        </div>
      </section>

      {bannerProducts.length > 0 && <ProductCarousel data={bannerProducts} />}

      {/* Latest products */}
      <section className='space-y-8'>
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='space-y-3'>
            <p className='eyebrow'>{t('FEATURED_EYEBROW')}</p>
            <h2 className='section-title'>{t('FEATURED_TITLE')}</h2>
          </div>
          <Button asChild variant='ghost' className='rounded-full'>
            <Link href='/store'>
              {t('FEATURED_VIEW_ALL')}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <ProductList data={latestProducts} limit={4} emptyMessage={t('STORE_EMPTY')} />
      </section>

      {/* Values */}
      <section className='grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4'>
        {values.map(({ icon: Icon, title, body }) => (
          <div key={title} className='space-y-3 bg-background p-6'>
            <Icon className='h-6 w-6 text-primary' strokeWidth={1.5} />
            <h3 className='font-sans text-base font-semibold'>{title}</h3>
            <p className='text-sm leading-6 text-muted-foreground'>{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
