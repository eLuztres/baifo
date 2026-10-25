import { redirect } from 'next/navigation';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  /** `sub`: a subcategory's slug, e.g. one kind of service. */
  searchParams: Promise<{ sub?: string }>;
}

// A category is a way into the feed now; old links and bookmarks land there, opening with that category.
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, { sub }] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams({ c: slug, ...(sub ? { sub } : {}) });
  redirect(`/explore?${query}`);
}
