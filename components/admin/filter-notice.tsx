import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getT } from '@/lib/i18n-server';

interface FilterNoticeProps {
  query?: string;
  /** The same list without the search. */
  clearHref: string;
}

/** 'Filtered by "…"' next to an admin list's title, with a button to show everything again. */
export default async function FilterNotice({ query, clearHref }: FilterNoticeProps) {
  if (!query) return null;
  const { t } = await getT();

  return (
    <div>
      {t('ADMIN_FILTERED_BY')} <i>&quot;{query}&quot;</i>{' '}
      <Button asChild variant='outline' size='sm'>
        <Link href={clearHref}>{t('ADMIN_REMOVE_FILTER')}</Link>
      </Button>
    </div>
  );
}
