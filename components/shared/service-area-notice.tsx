import { SERVICE_AREA } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

/** A slim bar above the header while the shop only serves some places (SERVICE_AREA). */
const ServiceAreaNotice = async () => {
  if (!SERVICE_AREA) return null;
  const { t } = await getT();

  return (
    <p className='bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground'>
      {t('SERVICE_AREA_NOTICE', { area: SERVICE_AREA })}
    </p>
  );
};

export default ServiceAreaNotice;
