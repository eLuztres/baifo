import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getOrderSummary } from '@/lib/actions/order.actions';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import { BadgeDollarSign, Barcode, CreditCard, Users } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import Charts from './charts';
import NotificationSettingsForm from '@/components/admin/notification-settings-form';
import { ORDER_ALERT_EMAILS } from '@/lib/constants';
import { getShopSettings } from '@/lib/shop-settings';
import { requireAdmin } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ADMIN_DASHBOARD') };
}

const AdminOverviewPage = async () => {
  await requireAdmin();

  const [{ t, locale }, summary, settings] = await Promise.all([getT(), getOrderSummary(), getShopSettings()]);

  return (
    <div className='space-y-2'>
      <h1 className='h2-bold'>{t('ADMIN_DASHBOARD')}</h1>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('ADMIN_TOTAL_REVENUE')}</CardTitle>
            <BadgeDollarSign />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(summary.totalSales._sum.totalPrice ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('ORDERS_TITLE')}</CardTitle>
            <CreditCard />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatNumber(summary.ordersCount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('ADMIN_CUSTOMERS')}</CardTitle>
            <Users />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatNumber(summary.usersCount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('ADMIN_PRODUCTS')}</CardTitle>
            <Barcode />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatNumber(summary.productsCount)}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
        <Card className='col-span-4'>
          <CardHeader>
            <CardTitle>{t('ADMIN_OVERVIEW')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Charts
              data={{
                salesData: summary.salesData,
              }}
            />
          </CardContent>
        </Card>
        <Card className='col-span-3'>
          <CardHeader>
            <CardTitle>{t('ADMIN_LATEST_ORDERS')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className='uppercase'>
                  <TableHead>{t('FIELD_BUYER')}</TableHead>
                  <TableHead>{t('FIELD_DATE')}</TableHead>
                  <TableHead>{t('ORDER_TOTAL')}</TableHead>
                  <TableHead>{t('FIELD_ACTIONS')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.latestSales.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.user.name}</TableCell>
                    <TableCell>
                      {formatDateTime(order.createdAt, locale).dateOnly}
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalPrice)}</TableCell>
                    <TableCell>
                      <Link href={`/order/${order.id}`}>
                        <span className='px-2'>{t('ORDERS_DETAILS')}</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('SETTINGS_NOTIFICATIONS')}</CardTitle>
          <p className='text-sm text-muted-foreground'>{t('SETTINGS_NOTIFICATIONS_TEXT')}</p>
        </CardHeader>
        <CardContent>
          <NotificationSettingsForm settings={settings} defaultEmails={ORDER_ALERT_EMAILS.join(', ')} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverviewPage;
