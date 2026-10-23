import { Metadata } from 'next';
import { getMyOrders } from '@/lib/actions/order.actions';
import { formatCurrency, formatDateTime, formatId } from '@/lib/utils';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/shared/pagination';
import { requireUser } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ORDER_HISTORY') };
}

const OrdersPage = async (props: {
  searchParams: Promise<{ page?: string }>;
}) => {
  await requireUser();
  const page = Number((await props.searchParams).page) || 1;

  const [{ t, locale }, orders] = await Promise.all([getT(), getMyOrders({ page })]);

  return (
    <div className='space-y-2'>
      <h2 className='h2-bold'>{t('ORDERS_TITLE')}</h2>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='uppercase'>
              <TableHead>{t('FIELD_ID')}</TableHead>
              <TableHead>{t('FIELD_DATE')}</TableHead>
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
                  <Link href={`/order/${order.id}`}>
                    <span className='px-2'>{t('ORDERS_DETAILS')}</span>
                  </Link>
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

export default OrdersPage;
