'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Input } from '../ui/input';
import { useI18n } from '@/components/i18n-provider';

const AdminSearch = () => {
  const { t } = useI18n();
  const pathname = usePathname();
  const formActionUrl = pathname.includes('/admin/orders')
    ? '/admin/orders'
    : pathname.includes('/admin/users')
      ? '/admin/users'
      : '/admin/products';

  const query = useSearchParams().get('query') || '';

  return (
    <form action={formActionUrl} method='GET'>
      {/* The key resets the field when the URL's query changes, e.g. after "Remove filter". */}
      <Input
        key={query}
        type='search'
        placeholder={t('ADMIN_SEARCH_PLACEHOLDER')}
        aria-label={t('ADMIN_SEARCH')}
        name='query'
        defaultValue={query}
        className='md:w-[100px] lg:w-[300px]'
      />
      <button className='sr-only' type='submit'>
        {t('ADMIN_SEARCH')}
      </button>
    </form>
  );
};

export default AdminSearch;
