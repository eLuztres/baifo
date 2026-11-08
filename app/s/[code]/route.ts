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
  const chatUrl = BRAND.contact.sellWhatsappUrl(message);
  if (!chatUrl) return NextResponse.redirect(new URL('/', request.url));
  const isAndroid = /Android/i.test(request.headers.get('user-agent') ?? '');
  return NextResponse.redirect(isAndroid ? androidAppIntent(chatUrl) : chatUrl);
}

/** After a QR scan, Android's browser keeps a redirected https link to itself and shows WhatsApp's download page;
    an intent opens the installed app, and the browser falls back to the same link when there is none. */
const androidAppIntent = (chatUrl: string) => {
  const { search } = new URL(chatUrl);
  return `intent://send${search}#Intent;scheme=whatsapp;S.browser_fallback_url=${encodeURIComponent(chatUrl)};end`;
};
