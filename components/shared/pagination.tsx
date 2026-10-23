'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { formUrlQuery } from '@/lib/utils';

interface PaginationProps {
  page: number | string;
  totalPages: number;
  urlParamName?: string;
}

const Pagination = ({ page, totalPages, urlParamName }: PaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const goToPage = (pageValue: number) => {
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: urlParamName || 'page',
      value: pageValue.toString(),
    });

    router.push(newUrl);
  };

  return (
    <div className='flex gap-2'>
      <Button
        size='lg'
        variant='outline'
        className='w-28'
        disabled={Number(page) <= 1}
        onClick={() => goToPage(Number(page) - 1)}
      >
        {t('PAGINATION_PREVIOUS')}
      </Button>
      <Button
        size='lg'
        variant='outline'
        className='w-28'
        disabled={Number(page) >= totalPages}
        onClick={() => goToPage(Number(page) + 1)}
      >
        {t('PAGINATION_NEXT')}
      </Button>
    </div>
  );
};

export default Pagination;
