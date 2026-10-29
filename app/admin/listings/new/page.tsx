import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, HandHelping, Package, Search } from 'lucide-react';
import AdminListingWorkspace from '@/components/marketplace/admin-listing-workspace';
import ListingTypeInfo from '@/components/marketplace/listing-type-info';
import NewListingForm from '@/components/marketplace/new-listing-form';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { LISTING_TYPES, listingTypeOf, newListingPath } from '@/lib/constants';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminTexts(await getLocale()).newListing };
}

// "Crear con IA" starts the AI work inside the action's time.
export const maxDuration = 300;

interface NewListingPageProps {
  /**
   * `tipo`: the listing type's link name (LISTING_TYPE_PARAMS), e.g. servicios; none: a product.
   * `anuncio`: the listing made by "Crear con IA", so the whole creation stays on this page (and survives a reload).
   */
  searchParams: Promise<{ tipo?: string; anuncio?: string }>;
}

export default async function NewListingPage({ searchParams }: NewListingPageProps) {
  await requireAdmin();
  const [locale, { tipo, anuncio }] = await Promise.all([getLocale(), searchParams]);
  const texts = adminTexts(locale);
  const backLink = (
    <Link href='/admin/listings' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
      <ChevronLeft className='size-4' /> {texts.back}
    </Link>
  );
  if (anuncio) {
    return (
      <div className='space-y-4'>
        {backLink}
        <AdminListingWorkspace id={anuncio} locale={locale} texts={texts} />
      </div>
    );
  }
  const listingType = listingTypeOf(tipo) ?? 'PRODUCT';
  const icons = { PRODUCT: Package, WANTED: Search, SERVICE: HandHelping, EVENT: CalendarDays };
  const intro = { PRODUCT: '', SERVICE: texts.newServiceIntro, WANTED: texts.newWantedIntro, EVENT: texts.newEventIntro }[listingType];
  return (
    <div className='space-y-8'>
      {backLink}
      {/* One form for all four; the choice only changes what the AI writes and which fields there are. */}
      <div className='mx-auto max-w-xl text-center'>
        {/* One row in every language down to 320px: small words and tight padding on phones, no icons. */}
        <nav aria-label={texts.typeLabel} className='inline-flex max-w-full rounded-full bg-muted p-1'>
          {LISTING_TYPES.map((type) => {
            const Icon = icons[type];
            const label = texts[`type_${type}`];
            const icon = <Icon className='hidden size-4 sm:block' aria-hidden />;
            // The chosen type's tab explains it in a popup instead of a paragraph under the tabs.
            if (type === listingType && intro) {
              return <ListingTypeInfo key={type} label={label} text={intro} infoLabel={texts.typeInfo} icon={icon} />;
            }
            return (
              <Link
                key={type}
                href={newListingPath(type)}
                aria-current={type === listingType ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-2 py-2 text-xs font-medium transition-colors min-[400px]:px-3 min-[400px]:text-sm sm:px-4',
                  type === listingType ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {icon} {label}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* No key on the type: switching tabs keeps the photos already uploaded. */}
      <NewListingForm texts={texts} type={listingType} />
    </div>
  );
}
