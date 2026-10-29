import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import AdminListingWorkspace from '@/components/marketplace/admin-listing-workspace';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminTexts(await getLocale()).listingsTitle };
}

// The AI work started by "Crear con IA" runs within the action's time; this page only reads.
export const maxDuration = 300;

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingPage({ params }: ListingPageProps) {
  await requireAdmin();
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const texts = adminTexts(locale);

  return (
    <div className='space-y-3 sm:space-y-4'>
      <Link href='/admin/listings' className='inline-flex items-center gap-1 text-xs text-muted-foreground sm:text-sm hover:text-foreground'>
        <ChevronLeft className='size-4' /> {texts.back}
      </Link>
      <AdminListingWorkspace id={id} locale={locale} texts={texts} />
    </div>
  );
}
