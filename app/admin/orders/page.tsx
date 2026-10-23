import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteOrder, getAllOrders } from '@/lib/actions/order.actions';
import { formatCurrency, formatDateTime, formatId } from '@/lib/utils';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Pagination from '@/components/shared/pagination';
import DeleteDialog from '@/components/shared/delete-dialog';
import FilterNotice from '@/components/admin/filter-notice';
import { requireAdmin } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ORDERS_TITLE') };
}

const AdminOrdersPage = async (props: {
  searchParams: Promise<{ page?: string; query?: string }>;
}) => {
  await requireAdmin();
  const { page: pageParam, query: searchText } = await props.searchParams;
  const page = Number(pageParam) || 1;

  const [{ t, locale }, orders] = await Promise.all([
    getT(),
    getAllOrders({ page, query: searchText ?? '' }),
  ]);

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-3'>
        <h1 className='h2-bold'>{t('ORDERS_TITLE')}</h1>
        <FilterNotice query={searchText} clearHref='/admin/orders' />
      </div>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='uppercase'>
              <TableHead>{t('FIELD_ID')}</TableHead>
              <TableHead>{t('FIELD_DATE')}</TableHead>
              <TableHead>{t('FIELD_BUYER')}</TableHead>
              <TableHead>{t('ORDER_TOTAL')}</TableHead>
              <TableHead>{t('FIELD_PAID')}</TableHead>
              <TableHead>{t('FIELD_DELIVERED')}</TableHead>
              <TableHead>{t('FIELD_ACTIONS')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.data.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{formatId(order.id)}</TableCell>
                <TableCell>
                  {formatDateTime(order.createdAt, locale).dateTime}
                </TableCell>
                <TableCell>{order.user.name}</TableCell>
                <TableCell>{formatCurrency(order.totalPrice)}</TableCell>
                <TableCell>
                  {order.isPaid && order.paidAt
                    ? formatDateTime(order.paidAt, locale).dateTime
                    : t('ORDER_NOT_PAID')}
                </TableCell>
                <TableCell>
                  {order.isDelivered && order.deliveredAt
                    ? formatDateTime(order.deliveredAt, locale).dateTime
                    : t('ORDER_NOT_DELIVERED')}
                </TableCell>
                <TableCell>
                  <Button asChild variant='outline' size='sm'>
                    <Link href={`/order/${order.id}`}>{t('ORDERS_DETAILS')}</Link>
                  </Button>
                  <DeleteDialog id={order.id} action={deleteOrder} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.totalPages > 1 && (
          <Pagination page={page} totalPages={orders.totalPages} />
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
