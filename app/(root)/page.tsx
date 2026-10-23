import HomePage from './home-page';

interface PageProps {
  searchParams: Promise<{ material?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { material } = await searchParams;
  return <HomePage material={material} />;
}
