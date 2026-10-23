import { redirect } from 'next/navigation';
import { SECTION_IDS } from '@/components/shared/home/one-page';

interface StorePageProps {
  searchParams: Promise<{ material?: string }>;
}

// The store is a part of the one-page home now; old links and bookmarks land there.
export default async function StorePage({ searchParams }: StorePageProps) {
  const { material } = await searchParams;
  const query = material ? `?material=${encodeURIComponent(material)}` : '';
  redirect(`/${query}#${SECTION_IDS.showroom}`);
}
