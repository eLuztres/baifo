import Image from 'next/image';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getT } from '@/lib/i18n-server';
import { formatCurrency } from '@/lib/utils';
import { OrderItem } from '@/types';
import OrderInfoCard from './order-info-card';

interface OrderItemsTableProps {
  items: OrderItem[];
}

/** The items of a cart about to be ordered, or of a placed order. */
export default async function OrderItemsTable({ items }: OrderItemsTableProps) {
  const { t } = await getT();

  return (
    <OrderInfoCard title={t('ORDER_ITEMS')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('CART_ITEM')}</TableHead>
            <TableHead>{t('CART_QUANTITY')}</TableHead>
            <TableHead className='text-right'>{t('CART_PRICE')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.productId}>
              <TableCell>
                <Link href={`/product/${item.slug}`} className='flex items-center'>
                  <Image src={item.image} alt={item.name} width={50} height={50} />
                  <span className='px-2'>{item.name}</span>
                </Link>
              </TableCell>
              <TableCell>
                <span className='px-2'>{item.qty}</span>
              </TableCell>
              <TableCell className='text-right'>{formatCurrency(item.price)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </OrderInfoCard>
  );
}
