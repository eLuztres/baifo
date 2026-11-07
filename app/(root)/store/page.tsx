import { redirect } from 'next/navigation';

interface StorePageProps {
  searchParams: Promise<{ category?: string }>;
}

// Old store links and bookmarks land on the explore view.
export default async function StorePage({ searchParams }: StorePageProps) {
  const { category } = await searchParams;
  const query = category ? `?categoria=${encodeURIComponent(category)}` : '';
  redirect(`/explore${query}`);
}
