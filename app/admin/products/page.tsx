import Link from 'next/link';
import { Metadata } from 'next';
import { getAllProducts, deleteProduct } from '@/lib/actions/product.actions';
import { formatCurrency, formatId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/shared/pagination';
import DeleteDialog from '@/components/shared/delete-dialog';
import FilterNotice from '@/components/admin/filter-notice';
import { requireAdmin } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';
import { isReservationActive } from '@/lib/reservation';
import { CancelReservationButton, ReservationNotice } from '@/components/shared/product/reserve-button';
import ProductCatalog from '@/components/admin/catalog/product-catalog';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ADMIN_PRODUCTS') };
}

const AdminProductsPage = async (props: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    category?: string;
    /** The category open in the tree (its slug). */
    c?: string;
  }>;
}) => {
  await requireAdmin()
  const searchParams = await props.searchParams;

  const page = Number(searchParams.page) || 1;
  const searchText = searchParams.query || '';
  const category = searchParams.category || '';

  // Without a search the rings are shown as a tree of categories; a search lists the matches.
  if (!searchText && !category) return <ProductCatalog selectedSlug={searchParams.c} />;

  const [{ t }, products] = await Promise.all([
    getT(),
    getAllProducts({
      query: searchText,
      page,
      category,
    }),
  ]);

  return (
    <div className='space-y-2'>
      <div className='flex-between'>
        <div className='flex items-center gap-3'>
          <h1 className='h2-bold'>{t('ADMIN_PRODUCTS')}</h1>
          <FilterNotice query={searchText} clearHref='/admin/products' />
        </div>
        <Button asChild variant='default'>
          <Link href='/admin/products/create'>{t('ADMIN_CREATE_PRODUCT')}</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className='uppercase'>
            <TableHead>{t('FIELD_ID')}</TableHead>
            <TableHead>{t('FIELD_NAME')}</TableHead>
            <TableHead className='text-right'>{t('FIELD_PRICE')}</TableHead>
            <TableHead>{t('FIELD_CATEGORY')}</TableHead>
            <TableHead>{t('FIELD_STOCK')}</TableHead>
            <TableHead>{t('FIELD_RATING')}</TableHead>
            <TableHead className='w-[100px]'>{t('FIELD_ACTIONS')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.data.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{formatId(product.id)}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell className='text-right'>
                {formatCurrency(product.price)}
              </TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>
                {product.stock}
                {product.stock > 0 && isReservationActive(product) && (
                  <div className='text-xs text-primary'>
                    <ReservationNotice until={new Date(product.reservedUntil!).toISOString()} isMine={false} />
                    <CancelReservationButton productId={product.id} className='h-auto p-0 text-xs' />
                  </div>
                )}
              </TableCell>
              <TableCell>{product.rating.toString()}</TableCell>
              <TableCell className='flex gap-1'>
                <Button asChild variant='outline' size='sm'>
                  <Link href={`/admin/products/${product.id}`}>{t('ADMIN_EDIT')}</Link>
                </Button>
                <DeleteDialog id={product.id} action={deleteProduct} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {products.totalPages > 1 && (
        <Pagination page={page} totalPages={products.totalPages} />
      )}
    </div>
  );
};

export default AdminProductsPage;
