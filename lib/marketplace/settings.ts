import { prisma } from '@/db/prisma';
import { LISTINGS_EMAIL } from './config';

const SETTINGS_ID = 'default';

/** Baifo's admin settings; the listings email falls back to LISTINGS_EMAIL until it is set in the admin. */
export async function getMarketplaceSettings() {
  const settings = await prisma.marketplaceSettings.findUnique({ where: { id: SETTINGS_ID } });
  return {
    listingsEmail: settings?.listingsEmail ?? LISTINGS_EMAIL ?? '',
    sendOnPublish: settings?.sendOnPublish ?? true,
  };
}

export function saveMarketplaceSettings(data: { listingsEmail: string; sendOnPublish: boolean }) {
  return prisma.marketplaceSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...data },
  });
}
