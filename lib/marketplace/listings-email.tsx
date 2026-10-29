import { Column, Heading, Img, Link, Row, Section, Text } from '@react-email/components';
import QRCode from 'qrcode';
import { prisma } from '@/db/prisma';
import { EmailLayout, emailService } from '@/email';
import type { ListingType } from '@/lib/constants';
import { formatPriceOrRange } from '@/lib/utils';
import { adminTexts } from './admin-texts';
import { productUrl } from './config';
import { getMarketplaceSettings } from './settings';
import { coverPicture } from '@/lib/video';

interface LiveListing {
  slug: string;
  name: string;
  image?: string;
  price: string;
  priceMax: string | null;
  type: ListingType;
  phone: string | null;
  expiresAt: Date | null;
}

interface ListingsEmailProps {
  listings: LiveListing[];
}

const TEXTS = adminTexts('es');

/** "Busco · 100–150 €", "Busco · hasta 60 €", "Servicio" (no "from" price) or just the price of an item. */
const priceLine = ({ type, price, priceMax }: LiveListing) =>
  [
    type !== 'PRODUCT' && TEXTS[`type_${type}`],
    type === 'PRODUCT' || Number(price) > 0 ? formatPriceOrRange(price, priceMax) : priceMax && `${TEXTS.budgetTo} ${formatPriceOrRange(0, priceMax)}`,
  ]
    .filter(Boolean)
    .join(' · ');

const qrContentId = (slug: string) => `qr-${slug}`;

/** A PNG attached inline, because Gmail blocks data: images. Dark on white so it scans when printed. */
const qrAttachment = async (slug: string) => ({
  filename: `${qrContentId(slug)}.png`,
  content: await QRCode.toBuffer(productUrl(slug), { type: 'png', errorCorrectionLevel: 'M', margin: 2, width: 240 }),
  contentType: 'image/png',
  inlineContentId: qrContentId(slug),
});

const dateOf = (date: Date | null) => (date ? date.toLocaleDateString('es-ES', { timeZone: 'Atlantic/Canary' }) : '');

/** Every live listing with photo, price and the seller's WhatsApp: made to be printed and pinned up. */
export function ListingsEmail({ listings }: ListingsEmailProps) {
  return (
    <EmailLayout lang='es' preview={`${listings.length} anuncios online en Baifo`}>
      <Heading as='h1' className='m-0 mb-4 text-2xl'>
        Anuncios online ({listings.length})
      </Heading>
      {listings.map((listing) => (
        <Section key={listing.slug} className='mb-4 border-b border-solid border-[#e5d8c3] pb-4'>
          <Row>
            <Column width='110'>{listing.image && <Img src={listing.image} alt={listing.name} width='96' height='96' className='rounded-lg object-cover' />}</Column>
            <Column>
              <Text className='m-0 text-base font-semibold'>{listing.name}</Text>
              <Text className='m-0 text-lg'>{priceLine(listing)}</Text>
              {listing.phone && <Text className='m-0'>WhatsApp: {listing.phone}</Text>}
              {/* break-all: the long link would otherwise push the QR column off a phone screen */}
              <Text className='m-0 break-all text-xs text-[#6b6259]'>
                <Link href={productUrl(listing.slug)}>{productUrl(listing.slug)}</Link> · hasta {dateOf(listing.expiresAt)}
              </Text>
            </Column>
            <Column width='110' align='right'>
              <Img src={`cid:${qrContentId(listing.slug)}`} alt={`QR ${listing.name}`} width='96' height='96' />
            </Column>
          </Row>
        </Section>
      ))}
    </EmailLayout>
  );
}

/**
 * Sends the current list to the address set in the admin (or LISTINGS_EMAIL). After a new listing
 * (isAutomatic) only when the admin wants that; "Enviar lista" always sends.
 */
export async function sendListingsEmail({ isAutomatic = true } = {}) {
  const { listingsEmail, sendOnPublish } = await getMarketplaceSettings();
  if (!listingsEmail) return { success: false, error: 'No email address set' };
  if (isAutomatic && !sendOnPublish) return { success: true };
  const products = await prisma.product.findMany({
    where: { sellerId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { slug: true, name: true, images: true, price: true, priceMax: true, type: true, contactPhone: true, expiresAt: true },
  });
  const listings = products.map(({ images, contactPhone, price, ...product }) => ({
    ...product,
    image: coverPicture(images),
    price: price.toString(),
    phone: contactPhone,
  }));
  const result = await emailService.send({
    to: listingsEmail,
    subject: `Baifo: ${listings.length} anuncios online`,
    react: <ListingsEmail listings={listings} />,
    attachments: await Promise.all(listings.map(({ slug }) => qrAttachment(slug))),
    tags: [{ name: 'type', value: 'listings' }],
  });
  if (!result.success) console.error(`[email] Listings email not sent: ${result.error}`);
  return result;
}
