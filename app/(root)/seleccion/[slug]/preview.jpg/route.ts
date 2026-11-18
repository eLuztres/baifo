import { prisma } from '@/db/prisma';
import { getInStockRings } from '@/components/shared/home/in-stock-rings';
import { BRAND, EMAIL_COLORS } from '@/lib/brand';
import { sharePreviewResponse } from '@/lib/share-preview';
import { todayListings, TODAY_SLUG } from '@/lib/today';

// Hoy's sun, soft as on the site: the accent color on a disc of the page's background. A picture can't read CSS variables, so plain colors, as in emails.
const SUN_BADGE = `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="168">
  <circle cx="84" cy="84" r="84" fill="${EMAIL_COLORS.header}" fill-opacity="0.92"/>
  <svg x="36" y="36" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${BRAND.colors.accent ?? EMAIL_COLORS.primary}" stroke-width="1.5" stroke-linecap="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
    <path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
  </svg>
</svg>`;

/** What a shared Mercadillo shows: its icon, else its picture, else its first listing's. Hoy: its first listing's, with its sun. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === TODAY_SLUG) {
    const [first] = todayListings(await getInStockRings());
    // A quiet day: the shop's own share picture, as on any other page.
    return sharePreviewResponse(first?.image ?? BRAND.ogImage ?? BRAND.logo, SUN_BADGE);
  }
  const mercadillo = await prisma.mercadillo.findUnique({ where: { slug }, select: { id: true, image: true, icon: true } });
  if (!mercadillo) return new Response(null, { status: 404 });
  const picture = mercadillo.icon ?? mercadillo.image ?? (await getInStockRings({ mercadillos: { some: { id: mercadillo.id } } }))[0]?.image;
  return sharePreviewResponse(picture);
}
