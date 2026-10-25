import { redirect } from 'next/navigation';
import { SECTION_IDS } from '@/components/shared/home/one-page';

interface StorePageProps {
  searchParams: Promise<{ category?: string }>;
}

// The store is a part of the one-page home now; old links and bookmarks land there.
export default async function StorePage({ searchParams }: StorePageProps) {
  const { category } = await searchParams;
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  redirect(`/${query}#${SECTION_IDS.showroom}`);
}
