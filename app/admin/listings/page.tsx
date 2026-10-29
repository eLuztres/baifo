import type { Metadata } from 'next';
import Link from 'next/link';
import { HandHelping, Plus, Trash2 } from 'lucide-react';
import type { SubmissionStatus } from '@prisma/client';
import { LISTING_TYPE_PARAMS, LISTING_TYPES, listingTypeOf, newListingPath, type ListingType } from '@/lib/constants';
import { prisma } from '@/db/prisma';
import ProductMedia from '@/components/ProductMedia';
import DeleteDialog from '@/components/shared/delete-dialog';
import { Button } from '@/components/ui/button';
import { deleteProduct } from '@/lib/actions/product.actions';
import { deleteAdminListing } from '@/lib/marketplace/admin.actions';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { HOUSE_SELLER } from '@/lib/marketplace/config';
import { getMarketplaceSettings } from '@/lib/marketplace/settings';
import ListingsEmailCard from '@/components/marketplace/listings-email-card';
import { adminTexts, fillText, statusText } from '@/lib/marketplace/admin-texts';
import { cn, formatCurrency } from '@/lib/utils';
import { coverPicture } from '@/lib/video';

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminTexts(await getLocale()).listingsTitle };
}

// The order of the filter tabs: what needs the admin first.
const STATUSES: SubmissionStatus[] = ['IN_REVIEW', 'PROCESSING', 'AWAITING_PAYMENT', 'LIVE', 'COLLECTING', 'SOLD', 'CANCELLED', 'FINISHED', 'EXPIRED', 'HIDDEN', 'REJECTED'];


interface ListingsPageProps {
  searchParams: Promise<{ estado?: string; tipo?: string }>;
}

/** The page's link with one filter changed and the other kept. */
const listingsHref = (status?: SubmissionStatus, type?: ListingType) => {
  const params = new URLSearchParams({ ...(status && { estado: status }), ...(type && { tipo: LISTING_TYPE_PARAMS[type] }) }).toString();
  return params ? `/admin/listings?${params}` : '/admin/listings';
};

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  await requireAdmin();
  const [{ estado, tipo }, locale] = await Promise.all([searchParams, getLocale()]);
  const texts = adminTexts(locale);
  const status = STATUSES.find((value) => value === estado);
  const type = listingTypeOf(tipo);

  const [listings, counts, settings, unlisted] = await Promise.all([
    prisma.submission.findMany({
      where: { ...(status ? { status } : { status: { not: 'COLLECTING' } }), ...(type && { type }) },
      orderBy: { updatedAt: 'desc' },
      take: 120,
      include: { seller: { select: { waId: true, name: true } } },
    }),
    prisma.submission.groupBy({ by: ['status'], where: type && { type }, _count: true }),
    getMarketplaceSettings(),
    // Products made without a listing (e.g. services from the first services form) are online too and need managing here.
    prisma.product.findMany({
      where: { submission: null, ...(type && { type }) },
      orderBy: { createdAt: 'desc' },
      take: 120,
      select: { id: true, name: true, images: true, price: true, type: true, contactPhone: true, expiresAt: true },
    }),
  ]);
  const countOf = (value: SubmissionStatus) =>
    (counts.find((count) => count.status === value)?._count ?? 0) + (value === 'LIVE' ? unlisted.length : 0);

  const cards = [
    ...listings.map((listing) => ({
      id: listing.id,
      href: `/admin/listings/${listing.id}`,
      image: coverPicture(listing.images) ?? coverPicture(listing.rawImages),
      title: listing.title,
      status: listing.status,
      type: listing.type,
      price: Number(listing.price) > 0 ? listing.price?.toString() : undefined,
      seller: listing.seller.waId === HOUSE_SELLER ? texts.houseSeller : (listing.seller.name ?? `+${listing.seller.waId}`),
      expiresAt: listing.expiresAt,
      deleteAction: deleteAdminListing,
    })),
    ...(!status || status === 'LIVE'
      ? unlisted.map((product) => ({
          id: product.id,
          href: `/admin/products/${product.id}`,
          image: coverPicture(product.images),
          title: product.name,
          status: 'LIVE' as const,
          type: product.type,
          price: Number(product.price) > 0 ? product.price.toString() : undefined,
          seller: product.contactPhone ?? texts.houseSeller,
          expiresAt: product.expiresAt,
          deleteAction: deleteProduct,
        }))
      : []),
  ];

  return (
    <div className='space-y-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='h2-bold'>{texts.listingsTitle}</h1>
          <p className='text-muted-foreground'>{texts.listingsIntro}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild className='rounded-full'>
            <Link href='/admin/listings/new'>
              <Plus /> {texts.newListing}
            </Link>
          </Button>
          <Button asChild variant='outline' className='rounded-full'>
            <Link href={newListingPath('SERVICE')}>
              <HandHelping /> {texts.newService}
            </Link>
          </Button>
        </div>
      </header>

      <ListingsEmailCard locale={locale} initialEmail={settings.listingsEmail} initialSendOnPublish={settings.sendOnPublish} />

      <nav aria-label={texts.typeFilter} className='flex flex-wrap gap-2'>
        {[undefined, ...LISTING_TYPES].map((value) => (
          <Link
            key={value ?? 'all'}
            href={listingsHref(status, value)}
            aria-current={value === type ? 'page' : undefined}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              value === type ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {value ? texts[`type_${value}`] : texts.all}
          </Link>
        ))}
      </nav>

      <nav className='flex flex-wrap gap-2'>
        {[undefined, ...STATUSES].map((value) => {
          const count = value ? countOf(value) : undefined;
          if (value && count === 0) return null;
          return (
            <Link
              key={value ?? 'all'}
              href={listingsHref(value, type)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition',
                value === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50'
              )}
            >
              {value ? `${statusText(texts, value, type)} · ${count}` : texts.all}
            </Link>
          );
        })}
      </nav>

      {cards.length === 0 ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{texts.empty}</p>
      ) : (
        <ul className='grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'>
          {cards.map((listing) => {
            const image = listing.image;
            return (
              <li key={listing.id} className='relative'>
                <Link
                  href={listing.href}
                  className='group block overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10'
                >
                  <div className='relative aspect-square bg-muted'>
                    {image && <ProductMedia src={image} alt={listing.title ?? ''} fill />}
                    <span className='absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow'>
                      {statusText(texts, listing.status, listing.type)}
                    </span>
                  </div>
                  <div className='space-y-1 p-4'>
                    <p className='truncate font-medium'>{listing.title ?? texts.noTitle}</p>
                    <p className='text-primary'>
                      {/* A service or event without an amount shows only its type. */}
                      {[listing.type !== 'PRODUCT' && texts[`type_${listing.type}`], listing.price ? formatCurrency(listing.price) : listing.type === 'PRODUCT' && texts.noPrice]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {listing.seller}
                      {listing.expiresAt && listing.status === 'LIVE' && ` · ${fillText(texts.until, { date: listing.expiresAt.toLocaleDateString(locale) })}`}
                    </p>
                  </div>
                </Link>
                {/* Outside the card's link, so a tap opens the dialog, not the listing. */}
                <div className='absolute right-3 top-3'>
                  <DeleteDialog
                    id={listing.id}
                    action={listing.deleteAction}
                    description={texts.deleteHint}
                    trigger={
                      <Button size='icon' variant='secondary' aria-label={texts.delete} className='size-9 rounded-full bg-background/90 shadow hover:bg-destructive hover:text-destructive-foreground'>
                        <Trash2 className='size-4' />
                      </Button>
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
