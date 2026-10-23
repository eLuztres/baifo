import { Button, Column, Heading, Img, Row, Section, Text } from '@react-email/components';
import { Order } from '@/types';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { EMAIL_COLORS, absoluteUrl } from '@/lib/brand';
import { getTranslator, type Locale, type TranslationKey } from '@/lib/i18n';
import { formatCurrency, formatDateTime, paymentMethodLabel } from '@/lib/utils';
import EmailLayout from './components/email-layout';
import { getShopLocale } from './shop-locale';

export interface PurchaseReceiptEmailProps {
  order: Order;
  locale?: Locale;
}

// Same muted text color and divider as the shared EmailLayout.
const LABEL_STYLE = { color: '#8a8494' };
const BORDER_COLOR = '#e8e4dc';

export default function PurchaseReceiptEmail({ order, locale = getShopLocale() }: PurchaseReceiptEmailProps) {
  const t = getTranslator(locale);
  const shop = { shop: APP_NAME };
  const name = order.user.name && order.user.name !== 'NO_NAME' ? order.user.name : null;
  const { fullName, streetAddress, postalCode, city, country } = order.shippingAddress;
  const facts: [TranslationKey, string][] = [
    ['RECEIPT_ORDER_ID', order.id],
    ['RECEIPT_DATE', formatDateTime(order.createdAt, locale).dateOnly],
    ['RECEIPT_PRICE_PAID', formatCurrency(order.totalPrice)],
    ['CHECKOUT_PAYMENT_METHOD', paymentMethodLabel(t, order.paymentMethod)],
  ];
  const totals: [TranslationKey, string][] = [
    ['ORDER_ITEMS_PRICE', order.itemsPrice],
    ['ORDER_TAX', order.taxPrice],
    ['ORDER_SHIPPING', order.shippingPrice],
    ['ORDER_TOTAL', order.totalPrice],
  ];

  return (
    <EmailLayout
      preview={t('RECEIPT_PREVIEW', shop)}
      lang={locale}
      tagline={t('FOOTER_TAGLINE')}
      footerNote={t('RECEIPT_REASON', shop)}
    >
      <Text
        className='m-0 mb-2 text-[11px] font-semibold uppercase tracking-[3px]'
        style={{ color: EMAIL_COLORS.primary }}
      >
        {t('RECEIPT_EYEBROW')}
      </Text>
      <Heading as='h1' className='m-0 mb-6 text-[28px] font-semibold leading-tight text-[#18181b]'>
        {t('RECEIPT_HEADING')}
      </Heading>
      <Text className='m-0 mb-4'>
        {name ? t('WELCOME_GREETING', { name }) : t('WELCOME_GREETING_ANON')}
      </Text>
      <Text className='m-0 mb-6'>{t('RECEIPT_INTRO')}</Text>

      <Section className='mb-2'>
        {facts.map(([label, value]) => (
          <Row key={label}>
            <Column className='w-1/2 align-top'>
              <Text className='m-0 mb-2 text-sm' style={LABEL_STYLE}>
                {t(label)}
              </Text>
            </Column>
            <Column className='align-top'>
              <Text className='m-0 mb-2 text-sm'>{value}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Section className='my-4 rounded-lg border border-solid p-4' style={{ borderColor: BORDER_COLOR }}>
        {order.orderitems.map((item) => (
          <Row key={item.productId} className='mb-4'>
            <Column className='w-20 align-top'>
              <Img width='64' alt={item.name} className='rounded' src={absoluteUrl(item.image, SERVER_URL)} />
            </Column>
            <Column className='align-top text-sm'>
              {item.name} × {item.qty}
            </Column>
            <Column align='right' className='align-top text-sm'>
              {formatCurrency(item.price)}
            </Column>
          </Row>
        ))}
        {totals.map(([label, price]) => (
          <Row key={label}>
            <Column align='right' className='text-sm' style={LABEL_STYLE}>
              {t(label)}
            </Column>
            <Column align='right' width={90}>
              <Text className='m-0 py-1 text-sm'>{formatCurrency(price)}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Text className='m-0 mb-6 text-sm'>
        {t('ORDER_ALERT_SHIP_TO', { address: `${fullName}, ${streetAddress}, ${postalCode} ${city}, ${country}` })}
      </Text>

      <Section className='mb-8 text-center'>
        <Button
          href={`${SERVER_URL}/order/${order.id}`}
          className='rounded-full px-8 py-3 text-sm font-semibold'
          style={{ backgroundColor: EMAIL_COLORS.primary, color: EMAIL_COLORS.primaryForeground }}
        >
          {t('ORDER_VIEW')}
        </Button>
      </Section>

      <Text className='m-0'>{t('WELCOME_SIGNOFF')}</Text>
      <Text className='m-0 font-semibold'>{APP_NAME}</Text>
    </EmailLayout>
  );
}

// A fixed sample for `npm run email`, so the preview needs neither a database nor sample data.
PurchaseReceiptEmail.PreviewProps = {
  locale: 'en',
  order: {
    id: '3f6c2a1e-5b4d-4c8a-9e21-3d6f8b0a1c2e',
    userId: '9a1d4e2b-7c3f-4b6a-8d5e-1f2a3b4c5d6e',
    user: { name: 'Ana Pérez', email: 'ana@example.com' },
    paymentMethod: 'Stripe',
    shippingAddress: {
      fullName: 'Ana Pérez',
      streetAddress: 'Calle Mayor 1',
      city: 'Las Palmas',
      postalCode: '35001',
      country: 'Spain',
    },
    createdAt: new Date('2026-05-04T10:30:00Z'),
    itemsPrice: '130.00',
    taxPrice: '0.00',
    shippingPrice: '0.00',
    totalPrice: '130.00',
    orderitems: [
      {
        productId: '1b2c3d4e-0000-4000-8000-000000000001',
        name: 'Lava ring',
        slug: 'lava-ring',
        qty: 1,
        image: '/images/sample-products/p1-1.jpg',
        price: '70.00',
      },
      {
        productId: '1b2c3d4e-0000-4000-8000-000000000002',
        name: 'Sea glass ring',
        slug: 'sea-glass-ring',
        qty: 1,
        image: '/images/sample-products/p2-1.jpg',
        price: '60.00',
      },
    ],
    isDelivered: false,
    deliveredAt: null,
    isPaid: true,
    paidAt: new Date('2026-05-04T10:31:00Z'),
    paymentResult: {
      id: 'ch_sample',
      status: 'COMPLETED',
      pricePaid: '130.00',
      email_address: 'ana@example.com',
    },
  },
} satisfies PurchaseReceiptEmailProps;
