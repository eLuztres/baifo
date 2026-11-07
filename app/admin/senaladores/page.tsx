import { Metadata } from 'next';
import ScoutAdmin from '@/components/admin/scout-admin';
import { prisma } from '@/db/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('SCOUTS_ADMIN_TITLE') };
}

/** The señaladores: people who send others to the shop with their own link and QR. */
const ScoutsPage = async () => {
  await requireAdmin();
  const { t } = await getT();
  const scouts = await prisma.scout.findMany({ orderBy: { createdAt: 'asc' }, include: { _count: { select: { submissions: true } } } });

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('SCOUTS_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('SCOUTS_ADMIN_INTRO', { shop: APP_NAME })}</p>
      </div>
      <ScoutAdmin
        shopName={APP_NAME}
        scouts={scouts.map(({ id, name, phone, code, _count }) => ({ id, name, phone, code, url: `${SERVER_URL}/s/${code}`, listingCount: _count.submissions }))}
      />
    </div>
  );
};

export default ScoutsPage;
