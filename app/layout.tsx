import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/assets/styles/globals.css';
import { SERVER_URL } from '@/lib/constants';
import { BRAND, absoluteUrl, getBrandCss } from '@/lib/brand';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { I18nProvider } from '@/components/i18n-provider';
import { getDictionary } from '@/lib/i18n';
import { getEnabledLocales, getLocale } from '@/lib/i18n-server';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

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
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
