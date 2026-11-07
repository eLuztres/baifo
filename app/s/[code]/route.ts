import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import { BRAND } from '@/lib/brand';
import { APP_NAME } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

/** A señalador's link (and QR): opens the shop's WhatsApp with their name and code in the text, so we know who sent the person. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const scout = await prisma.scout.findUnique({ where: { code: code.toLowerCase() }, select: { name: true, code: true } });
  const { t } = await getT();
  const message = scout
    ? t('SCOUT_WHATSAPP_MESSAGE', { shop: APP_NAME, name: scout.name, code: scout.code })
    : t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME });
  return NextResponse.redirect(BRAND.contact.sellWhatsappUrl(message) ?? new URL('/', request.url));
}
