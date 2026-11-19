import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { LocalizedText } from '@/lib/localize';

export { partnerPath } from '@/lib/partner-paths';

/** A partner's mercadillo as visitors see it: its page and its card in Explore. */
export interface PublicPartner {
  id: string;
  slug: string;
  name: LocalizedText;
  text: LocalizedText;
  icon: string | null;
  contactPhone: string | null;
}

/** A listing made in a partner's panel: it shows only on that mercadillo's page, never in the shop's own lists. */
export const partnerListingsWhere: Prisma.ProductWhereInput = { submission: { is: { partnerId: { not: null } } } };

/** Every partner's mercadillo, oldest first; never the panel link's secret. */
export const getPartners = async (): Promise<PublicPartner[]> =>
  (
    await prisma.partner.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true, name: true, text: true, icon: true, contactPhone: true },
    })
  ).map((partner) => ({ ...partner, name: partner.name as LocalizedText, text: partner.text as LocalizedText }));
