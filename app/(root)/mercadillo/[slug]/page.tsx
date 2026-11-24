import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ExplorePage, { generateMetadata as exploreMetadata } from '@/app/(root)/explore/page';
import { getPartners } from '@/lib/partners';

interface MercadilloPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

// Explore with only this partner's listings: the same search row, cards and way back as a selección's page.
// A selección or etiqueta in the address would show another page under this one's name.
const OTHER_PAGES = ['seleccion', 'mercadillo', 'etiqueta'];
const withPartner = async ({ params, searchParams }: MercadilloPageProps) => ({
  ...Object.fromEntries(Object.entries(await searchParams).filter(([key]) => !OTHER_PAGES.includes(key))),
  socio: (await params).slug,
});

export async function generateMetadata(props: MercadilloPageProps): Promise<Metadata> {
  return exploreMetadata({ searchParams: withPartner(props) });
}

/** A partner's own mercadillo page, which its card in Explore leads to. */
export default async function MercadilloPage(props: MercadilloPageProps) {
  const { slug } = await props.params;
  if (!(await getPartners()).some((partner) => partner.slug === slug)) notFound();
  return <ExplorePage searchParams={withPartner(props)} />;
}
