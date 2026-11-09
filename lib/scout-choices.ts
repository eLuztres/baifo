import type { ScoutChoice } from '@/components/shared/who-sent-you';
import { prisma } from '@/db/prisma';
import { BRAND } from '@/lib/brand';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import type { getT } from '@/lib/i18n-server';

type Translate = Awaited<ReturnType<typeof getT>>['t'];

/** The señaladores to choose from before placing a listing. Their link in the message makes WhatsApp show their photo. */
export async function getScoutChoices(t: Translate): Promise<ScoutChoice[]> {
  const scouts = await prisma.scout.findMany({ orderBy: { name: 'asc' }, select: { name: true, code: true, image: true } });
  return scouts.flatMap(({ name, code, image }) => {
    const href = BRAND.contact.sellWhatsappUrl(t('SCOUT_CHOSEN_MESSAGE', { shop: APP_NAME, name, url: `${SERVER_URL}/s/${code}` }));
    return href ? [{ name, image, href }] : [];
  });
}
