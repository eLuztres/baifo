import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/assets/styles/globals.css';
import { SERVER_URL } from '@/lib/constants';
import { BRAND, absoluteUrl, getBrandCss } from '@/lib/brand';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { I18nProvider } from '@/components/i18n-provider';
import { getDictionary } from '@/lib/i18n';
import { getEnabledLocales, getLocale } from '@/lib/i18n-server';
import TurnUpright from '@/components/shared/turn-upright';
import NoPinchZoom from '@/components/shared/no-pinch-zoom';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const LIGHT_BACKGROUND = BRAND.colors.background ?? '#FFFFFF';
const DARK_BACKGROUND = BRAND.darkColors.background ?? BRAND.colors.background ?? '#0B0B0F';

// The shop is laid out for the phone's own width; zooming only pushed it off the sides.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Phone browsers tint their bars with it: the page's own background, in light and in dark mode.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND.theme === 'dark' ? DARK_BACKGROUND : LIGHT_BACKGROUND },
    { media: '(prefers-color-scheme: dark)', color: BRAND.theme === 'light' ? LIGHT_BACKGROUND : DARK_BACKGROUND },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: {
      template: `%s | ${BRAND.name}`,
      default: BRAND.name,
    },
    description: getDictionary(locale).BRAND_DESCRIPTION || BRAND.description,
    metadataBase: new URL(SERVER_URL),
    icons: BRAND.icon,
    openGraph: {
      siteName: BRAND.name,
      locale,
      images: [absoluteUrl(BRAND.ogImage ?? BRAND.logo, SERVER_URL)],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const brandCss = getBrandCss();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* In <body> on purpose: an explicit, sometimes empty <head> made React drop the stylesheet links on hydration.
            Safe to inline: getBrandCss only lets through values matching SAFE_CSS_VALUE. */}
        {brandCss && <style dangerouslySetInnerHTML={{ __html: brandCss }} />}
        <ThemeProvider
          attribute='class'
          defaultTheme={BRAND.theme}
          forcedTheme={BRAND.theme === 'system' ? undefined : BRAND.theme}
          enableSystem={BRAND.theme === 'system'}
          disableTransitionOnChange
        >
          <I18nProvider
            locale={locale}
            locales={getEnabledLocales()}
            dictionary={getDictionary(locale)}
          >
            {children}
            <Toaster />
            <TurnUpright />
            <NoPinchZoom />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
