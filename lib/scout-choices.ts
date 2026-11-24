import type { ScoutChoice } from '@/components/shared/who-sent-you';
import { prisma } from '@/db/prisma';
import { BRAND } from '@/lib/brand';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import type { getT } from '@/lib/i18n-server';
import { cachePublicRead, STABLE_DATA_SECONDS } from '@/lib/public-cache';

type Translate = Awaited<ReturnType<typeof getT>>['t'];

/** Their link preview picture. The photo's file name in the address: a new photo isn't hidden behind the cached old one. */
export const scoutPreviewPath = (code: string, image: string) => `/s/${code}/preview.jpg?v=${encodeURIComponent(image.split('/').pop() ?? '')}`;

/** The text a señalador's link, QR or choice writes in WhatsApp. Their link at the end makes WhatsApp show their photo.
    The whole address: without "https://" (and its redirects to the shop's host) an iPhone showed no photo (card 614). */
export const scoutWhatsappMessage = (t: Translate, name: string, code: string) =>
  t('SCOUT_WHATSAPP_MESSAGE', { shop: APP_NAME, name, code, url: `${SERVER_URL}/s/${code}` });

const findScouts = cachePublicRead('scouts', () => prisma.scout.findMany({ orderBy: { name: 'asc' }, select: { name: true, code: true, image: true } }), STABLE_DATA_SECONDS);

/** The señaladores to choose from before placing a listing. Their link in the message makes WhatsApp show their photo. */
export async function getScoutChoices(t: Translate): Promise<ScoutChoice[]> {
  const scouts = await findScouts();
  return scouts.flatMap(({ name, code, image }) => {
    const href = BRAND.contact.sellWhatsappUrl(scoutWhatsappMessage(t, name, code));
    return href ? [{ name, image, href, preview: image ? scoutPreviewPath(code, image) : null }] : [];
  });
}
