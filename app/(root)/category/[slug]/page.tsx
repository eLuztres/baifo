import { redirect } from 'next/navigation';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

// Categories are gone; old links and bookmarks search the feed for the name, which the category's etiqueta carries.
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  redirect(`/explore?${new URLSearchParams({ q: slug })}`);
}
