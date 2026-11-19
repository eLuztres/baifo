import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, KeyRound, Pencil, Plus } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { Button } from '@/components/ui/button';
import { prisma } from '@/db/prisma';
import { BRAND } from '@/lib/brand';
import { formatEventDate } from '@/lib/event-date';
import { getT } from '@/lib/i18n-server';
import { localize } from '@/lib/localize';
import type { ListingTranslations } from '@/lib/marketplace/catalog';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { getSignedInPartner, PARTNER_ACTIVE_STATUSES } from '@/lib/partner-access';
import { PARTNER_PANEL_PATH, partnerListingPath } from '@/lib/partner-paths';
import { cn, formatPriceTag } from '@/lib/utils';
import { coverPicture } from '@/lib/video';

export async function generateMetadata(): Promise<Metadata> {
  const [{ t, locale }, partner] = await Promise.all([getT(), getSignedInPartner()]);
  return { title: partner ? localize(partner.name, locale) : BRAND.name, description: t('PARTNER_PANEL_TITLE') };
}

/** The partner's panel: its mercadillo, how many of its places it uses, its listings to change, and the ways to add one. */
export default async function PartnerPanelPage() {
  const [{ t, locale }, partner] = await Promise.all([getT(), getSignedInPartner()]);
  if (!partner) {
    return (
      <div className='mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center'>
        <KeyRound className='size-10 text-muted-foreground' aria-hidden />
        <p className='text-balance text-lg'>{t('PARTNER_LINK_INVALID')}</p>
      </div>
    );
  }
  const texts = adminTexts(locale);
  // Drafts only exist while the editor is open; the rest shows, newest first.
  const listings = await prisma.submission.findMany({
    where: { partnerId: partner.id, status: { not: 'COLLECTING' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, type: true, title: true, translations: true, price: true, priceMode: true, images: true, rawImages: true, startsAt: true },
  });
  const used = listings.filter((listing) => PARTNER_ACTIVE_STATUSES.includes(listing.status)).length;
  const isFull = used >= partner.maxListings;
  // Waiting to be shown is "Oculto" for a partner: it chose that, nobody reviews it.
  const statusName = (status: (typeof listings)[number]['status']) => (status === 'IN_REVIEW' ? texts.status_HIDDEN : texts[`status_${status}`]);
  // Below 360px only their icons: the count and both buttons stay on one line in every language.
  const addClass = 'h-10 rounded-full px-3 text-sm sm:px-4 sm:text-[15px]';
  const addLabel = 'max-[359px]:sr-only';

  return (
    <div className='mx-auto max-w-5xl space-y-5 sm:space-y-6'>
      <h1 className='sr-only'>{t('PARTNER_PANEL_TITLE')}</h1>
      <section className='flex items-start gap-4 rounded-3xl border border-border bg-card p-4 sm:items-center sm:p-6'>
        <MercadilloIcon src={partner.icon} sizes='5rem' className='size-16 sm:size-20' />
        <div className='min-w-0 flex-1'>
          <p className='text-xs uppercase tracking-wider text-primary'>{t('PARTNER_PANEL_TITLE')}</p>
          <p className='font-display text-3xl leading-tight sm:text-4xl'>{localize(partner.name, locale)}</p>
          {localize(partner.text, locale) && <p className='mt-1 line-clamp-2 text-sm text-muted-foreground'>{localize(partner.text, locale)}</p>}
        </div>
        <Button asChild variant='outline' className='size-10 shrink-0 rounded-full p-0 sm:w-auto sm:px-4'>
          <Link href={`${PARTNER_PANEL_PATH}/editar`} aria-label={t('PARTNER_EDIT')}>
            <Pencil /> <span className='max-sm:sr-only'>{t('PARTNER_EDIT')}</span>
          </Link>
        </Button>
      </section>

      {/* The count and both ways to add on one line, also on a 320px phone. */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2 sm:gap-3'>
          <div className='min-w-14 flex-1'>
            <p className='flex items-baseline gap-1.5'>
              <span className='text-2xl font-semibold tabular-nums'>{used}</span>
              <span className='text-muted-foreground'>
                / {partner.maxListings}
                <span className='max-sm:hidden'> {t('PARTNER_COUNT_LABEL')}</span>
              </span>
            </p>
            <div className='mt-1.5 h-1.5 max-w-56 overflow-hidden rounded-full bg-muted'>
              <div className='h-full rounded-full bg-primary' style={{ width: `${Math.min(100, (used / partner.maxListings) * 100)}%` }} />
            </div>
          </div>
          {isFull ? (
            <>
              <Button className={addClass} disabled>
                <Plus /> <span className={addLabel}>{t('CREATE_AD')}</span>
              </Button>
              <Button variant='outline' className={cn(addClass, 'border-primary/60 text-primary')} disabled>
                <CalendarPlus /> <span className={addLabel}>{t('CREATE_EVENT')}</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild className={addClass}>
                <Link href={`${PARTNER_PANEL_PATH}/nuevo`}>
                  <Plus /> <span className={addLabel}>{t('CREATE_AD')}</span>
                </Link>
              </Button>
              <Button asChild variant='outline' className={cn(addClass, 'border-primary/60 text-primary hover:text-primary')}>
                <Link href={`${PARTNER_PANEL_PATH}/nuevo?tipo=eventos`}>
                  <CalendarPlus /> <span className={addLabel}>{t('CREATE_EVENT')}</span>
                </Link>
              </Button>
            </>
          )}
        </div>
        {isFull && <p className='text-sm text-muted-foreground'>{t('PARTNER_FULL', { max: partner.maxListings })}</p>}
      </div>

      {listings.length === 0 ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{t('PARTNER_EMPTY')}</p>
      ) : (
        <ul className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3'>
          {listings.map((listing) => {
            const title = (listing.translations as ListingTranslations)[locale]?.title || listing.title || texts.newListing;
            const picture = coverPicture(listing.images.length > 0 ? listing.images : listing.rawImages);
            const hasPrice = listing.priceMode !== 'NONE' && Number(listing.price) > 0;
            const detail = [
              listing.type === 'EVENT' && listing.startsAt ? formatEventDate(listing.startsAt, locale, t('EVENT_TODAY')) : '',
              hasPrice ? formatPriceTag(Number(listing.price)) : '',
            ].filter(Boolean);
            return (
              <li key={listing.id}>
                <Link
                  href={partnerListingPath(listing.id)}
                  className='group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10'
                >
                  <div className='relative aspect-[4/3] bg-muted sm:aspect-square'>
                    {picture && <ProductMedia src={picture} alt='' fill sizes='(min-width: 1024px) 33vw, 50vw' isStill />}
                    <span
                      className={cn(
                        'absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-xl bg-background/90 px-2.5 py-1 text-xs font-medium shadow',
                        listing.status === 'LIVE' && 'text-primary'
                      )}
                    >
                      {statusName(listing.status)}
                    </span>
                  </div>
                  <div className='flex flex-1 flex-col gap-0.5 p-3'>
                    <p className='line-clamp-2 text-sm font-medium leading-5 sm:text-base'>{title}</p>
                    {detail.length > 0 && <p className='mt-auto truncate text-sm text-primary'>{detail.join(' · ')}</p>}
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
