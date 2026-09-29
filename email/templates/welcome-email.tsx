import { Button, Heading, Link, Section, Text } from '@react-email/components';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { BRAND, EMAIL_COLORS } from '@/lib/brand';
import { getTranslator, type Locale } from '@/lib/i18n';
import EmailLayout from '../components/email-layout';

export type WelcomeEmailProps = {
  name?: string | null;
  locale?: Locale;
};

export default function WelcomeEmail({ name, locale = 'en' }: WelcomeEmailProps) {
  const t = getTranslator(locale);
  const shop = { shop: APP_NAME };

  return (
    <EmailLayout
      preview={t('WELCOME_PREVIEW', shop)}
      lang={locale}
      tagline={t('FOOTER_TAGLINE')}
      footerNote={t('WELCOME_REASON', shop)}
    >
      <Text
        className='m-0 mb-2 text-[11px] font-semibold uppercase tracking-[3px]'
        style={{ color: EMAIL_COLORS.primary }}
      >
        {t('WELCOME_EYEBROW')}
      </Text>
      <Heading as='h1' className='m-0 mb-6 text-[28px] font-semibold leading-tight text-[#18181b]'>
        {t('WELCOME_HEADING', shop)}
      </Heading>

      <Text className='m-0 mb-4'>
        {name ? t('WELCOME_GREETING', { name }) : t('WELCOME_GREETING_ANON')}
      </Text>
      <Text className='m-0 mb-4'>{t('WELCOME_INTRO', shop)}</Text>
      <Text className='m-0 mb-8'>{t('WELCOME_ACCOUNT')}</Text>

      <Section className='mb-8 text-center'>
        <Button
          href={`${SERVER_URL}/store`}
          className='rounded-full px-8 py-3 text-sm font-semibold'
          style={{ backgroundColor: EMAIL_COLORS.primary, color: EMAIL_COLORS.primaryForeground }}
        >
          {t('WELCOME_CTA')}
        </Button>
      </Section>
      {BRAND.contact.instagramUrl && (
        <Text className='m-0 mb-8 text-center text-sm'>
          <Link href={BRAND.contact.instagramUrl} className='underline' style={{ color: EMAIL_COLORS.primary }}>
            {t('WELCOME_INSTAGRAM')}
          </Link>
        </Text>
      )}

      <Text className='m-0'>{t('WELCOME_SIGNOFF')}</Text>
      <Text className='m-0 font-semibold'>{APP_NAME}</Text>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name: 'Ana',
  locale: 'en',
} satisfies WelcomeEmailProps;
