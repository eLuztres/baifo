import type { ReactNode } from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { BRAND, EMAIL_COLORS, absoluteUrl } from '@/lib/brand';
import { getTranslator, isLocale } from '@/lib/i18n';

/**
 * Shared frame for every shop email: branded header, light body
 * (readable in every mail client), footer with links.
 */
export default function EmailLayout({
  preview,
  children,
  lang = 'en',
  tagline,
  footerNote,
}: {
  /** The one-line summary most inboxes show next to the subject. */
  preview: string;
  children: ReactNode;
  lang?: string;
  /** Short line under the brand name in the footer; defaults to the shop description in `lang`. */
  tagline?: string;
  /** Optional small print, e.g. why the recipient got this email. */
  footerNote?: string;
}) {
  const footerTagline =
    tagline ?? (getTranslator(isLocale(lang) ? lang : undefined)('BRAND_DESCRIPTION') || BRAND.description);

  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className='m-0 bg-[#f4f2ee] py-8 font-sans'>
          <Container className='mx-auto max-w-xl overflow-hidden rounded-2xl bg-white'>
            <Section className='px-8 py-6 text-center' style={{ backgroundColor: EMAIL_COLORS.header }}>
              <Link href={SERVER_URL}>
                <Img
                  src={absoluteUrl(BRAND.logo, SERVER_URL)}
                  alt={APP_NAME}
                  height='56'
                  className='mx-auto'
                />
              </Link>
            </Section>

            <Section className='px-8 py-8 text-[15px] leading-6 text-[#1c1a22]'>
              {children}
            </Section>

            <Hr className='mx-8 border-[#e8e4dc]' />
            <Section className='px-8 pb-8 text-center'>
              <Text className='m-0 text-xs text-[#8a8494]'>
                {APP_NAME} · {footerTagline}
              </Text>
              <Text className='m-0 mt-2 text-xs'>
                <Link href={SERVER_URL} style={{ color: EMAIL_COLORS.primary }}>
                  {SERVER_URL.replace(/^https?:\/\//, '')}
                </Link>
                {BRAND.contact.instagramUrl && (
                  <>
                    {'  ·  '}
                    <Link href={BRAND.contact.instagramUrl} style={{ color: EMAIL_COLORS.primary }}>
                      Instagram
                    </Link>
                  </>
                )}
              </Text>
              {footerNote && (
                <Text className='m-0 mt-4 text-[11px] leading-4 text-[#a9a3b1]'>
                  {footerNote}
                </Text>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
