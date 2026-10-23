import { Column, Heading, Img, Link, Row, Section, Text } from '@react-email/components';
import { prisma } from '@/db/prisma';
import { EmailLayout, emailService } from '@/email';
import { formatCurrency } from '@/lib/utils';
import { LISTINGS_EMAIL, productUrl } from './config';

interface LiveListing {
  slug: string;
  name: string;
  image?: string;
  price: string;
  phone: string | null;
  expiresAt: Date | null;
}

interface ListingsEmailProps {
  listings: LiveListing[];
}

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
              <Text className='m-0 text-lg'>{formatCurrency(listing.price)}</Text>
              {listing.phone && <Text className='m-0'>WhatsApp: {listing.phone}</Text>}
              <Text className='m-0 text-xs text-[#6b6259]'>
                <Link href={productUrl(listing.slug)}>{productUrl(listing.slug)}</Link> · hasta {dateOf(listing.expiresAt)}
              </Text>
            </Column>
          </Row>
        </Section>
      ))}
    </EmailLayout>
  );
}

/** Sends the current list to LISTINGS_EMAIL (skipped when it isn't set). */
export async function sendListingsEmail() {
  if (!LISTINGS_EMAIL) return;
  const products = await prisma.product.findMany({
    where: { sellerId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { slug: true, name: true, images: true, price: true, contactPhone: true, expiresAt: true },
  });
  const listings = products.map(({ images, contactPhone, price, ...product }) => ({
    ...product,
    image: images[0],
    price: price.toString(),
    phone: contactPhone,
  }));
  const result = await emailService.send({
    to: LISTINGS_EMAIL,
    subject: `Baifo: ${listings.length} anuncios online`,
    react: <ListingsEmail listings={listings} />,
    tags: [{ name: 'type', value: 'listings' }],
  });
  if (!result.success) console.error(`[email] Listings email not sent: ${result.error}`);
}
