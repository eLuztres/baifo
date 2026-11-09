import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import { BRAND } from '@/lib/brand';
import { APP_NAME } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

/** A señalador's link (and QR): opens the shop's WhatsApp with their name and code in the text, so we know who sent the person. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const scout = await prisma.scout.findUnique({ where: { code: code.toLowerCase() }, select: { name: true, code: true, image: true } });
  const { t } = await getT();
  const message = scout
    ? t('SCOUT_WHATSAPP_MESSAGE', { shop: APP_NAME, name: scout.name, code: scout.code })
    : t('SELL_WHATSAPP_MESSAGE', { shop: APP_NAME });
  const chatUrl = BRAND.contact.sellWhatsappUrl(message);
  if (!chatUrl) return NextResponse.redirect(new URL('/', request.url));
  const userAgent = request.headers.get('user-agent') ?? '';
  if (scout?.image && LINK_PREVIEW_BOTS.test(userAgent)) {
    return linkPreview(t('SCOUT_LINK_TITLE', { shop: APP_NAME, name: scout.name }), t('SCOUT_LINK_DESCRIPTION', { name: scout.name }), scout.image);
  }
  const isAndroid = /Android/i.test(userAgent);
  return NextResponse.redirect(isAndroid ? androidAppIntent(chatUrl) : chatUrl);
}

/** After a QR scan, Android's browser keeps a redirected https link to itself and shows WhatsApp's download page.
    An intent for the same https link opens whichever WhatsApp is installed (only normal WhatsApp knows whatsapp://,
    Business doesn't), and the browser falls back to the link when there is none. */
const androidAppIntent = (chatUrl: string) => {
  const { host, pathname, search } = new URL(chatUrl);
  return `intent://${host}${pathname}${search}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(chatUrl)};end`;
};

// Apps that fetch a shared link to draw its preview. Redirected, they'd show the shop's WhatsApp picture instead of the señalador.
const LINK_PREVIEW_BOTS = /WhatsApp|facebookexternalhit|Facebot|TelegramBot|Twitterbot|Slackbot|Discordbot|LinkedInBot|SkypeUriPreview|Applebot/i;

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Just the tags a link preview reads: the señalador's photo, name and a line about the link. */
const linkPreview = (title: string, description: string, image: string) => {
  const [safeTitle, safeDescription, safeImage] = [title, description, image].map(escapeHtml);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}">
<meta property="og:image" content="${safeImage}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary">
</head></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
};
