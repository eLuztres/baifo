import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, Plus } from 'lucide-react';
import type { SubmissionStatus } from '@prisma/client';
import { prisma } from '@/db/prisma';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { HOUSE_SELLER } from '@/lib/marketplace/config';
import { adminTexts, fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn, formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Anuncios' };

// The order of the filter tabs: what needs the admin first.
const STATUSES: SubmissionStatus[] = ['IN_REVIEW', 'PROCESSING', 'AWAITING_PAYMENT', 'LIVE', 'COLLECTING', 'SOLD', 'EXPIRED', 'REJECTED'];

const statusLabel = (texts: AdminTexts, status: SubmissionStatus) => texts[`status_${status}` as keyof AdminTexts];

interface ListingsPageProps {
  searchParams: Promise<{ estado?: string }>;
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  await requireAdmin();
  const [{ estado }, locale] = await Promise.all([searchParams, getLocale()]);
  const texts = adminTexts(locale);
  const status = STATUSES.find((value) => value === estado);

  const [listings, counts] = await Promise.all([
    prisma.submission.findMany({
      where: status ? { status } : { status: { not: 'COLLECTING' } },
      orderBy: { updatedAt: 'desc' },
      take: 120,
      include: { seller: { select: { waId: true, name: true } } },
    }),
    prisma.submission.groupBy({ by: ['status'], _count: true }),
  ]);
  const countOf = (value: SubmissionStatus) => counts.find((count) => count.status === value)?._count ?? 0;

  return (
    <div className='space-y-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='h2-bold'>{texts.listingsTitle}</h1>
          <p className='text-muted-foreground'>{texts.listingsIntro}</p>
        </div>
        <div className='flex gap-2'>
          <Button asChild variant='outline' className='rounded-full'>
            <Link href='/admin/simulator'>
              <MessageCircle /> {texts.simulator}
            </Link>
          </Button>
          <Button asChild className='rounded-full'>
            <Link href='/admin/listings/new'>
              <Plus /> {texts.newListing}
            </Link>
          </Button>
        </div>
      </header>

      <nav className='flex flex-wrap gap-2'>
        {[undefined, ...STATUSES].map((value) => {
          const count = value ? countOf(value) : undefined;
          if (value && count === 0) return null;
          return (
            <Link
              key={value ?? 'all'}
              href={value ? `/admin/listings?estado=${value}` : '/admin/listings'}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition',
                value === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50'
              )}
            >
              {value ? `${statusLabel(texts, value)} · ${count}` : texts.all}
            </Link>
          );
        })}
      </nav>

      {listings.length === 0 ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{texts.empty}</p>
      ) : (
        <ul className='grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'>
          {listings.map((listing) => {
            const image = listing.images[0] ?? listing.rawImages[0];
            return (
              <li key={listing.id}>
                <Link
                  href={`/admin/listings/${listing.id}`}
                  className='group block overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10'
                >
                  <div className='relative aspect-square bg-muted'>
                    {image && <ProductMedia src={image} alt={listing.title ?? ''} fill />}
                    <span className='absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow'>
                      {statusLabel(texts, listing.status)}
                    </span>
                  </div>
                  <div className='space-y-1 p-4'>
                    <p className='truncate font-medium'>{listing.title ?? texts.noTitle}</p>
                    <p className='text-primary'>{listing.price ? formatCurrency(listing.price.toString()) : texts.noPrice}</p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {listing.seller.waId === HOUSE_SELLER ? texts.houseSeller : (listing.seller.name ?? `+${listing.seller.waId}`)}
                      {listing.expiresAt && listing.status === 'LIVE' && ` · ${fillText(texts.until, { date: listing.expiresAt.toLocaleDateString(locale) })}`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
