import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Metadata } from 'next';
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

  const [{ t }, settings] = await Promise.all([getT(), getShopSettings()]);

  return (
    <div className='space-y-2'>
      <h1 className='h2-bold'>{t('ADMIN_DASHBOARD')}</h1>
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
