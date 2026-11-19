import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import BrandLogo from '@/components/shared/brand-logo';
import LanguageSwitcher from '@/components/shared/header/language-switcher';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { Button } from '@/components/ui/button';
import { getT } from '@/lib/i18n-server';
import { localize } from '@/lib/localize';
import { getSignedInPartner } from '@/lib/partner-access';
import { PARTNER_PANEL_PATH, partnerPath } from '@/lib/partner-paths';

// A private panel: no search engine should list it.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The partner's panel: its own small header, with the way to its public page. */
export default async function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ t, locale }, partner] = await Promise.all([getT(), getSignedInPartner()]);
  return (
    <div className='flex min-h-dvh flex-col'>
      <header className='sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md'>
        <div className='container mx-auto flex h-14 items-center gap-3 px-4 sm:h-16'>
          <Link href={PARTNER_PANEL_PATH} className='flex min-w-0 items-center gap-2 sm:gap-3'>
            <BrandLogo className='h-8 shrink-0 sm:h-10' />
            {partner && (
              <>
                <span aria-hidden className='h-7 w-px shrink-0 bg-border' />
                <MercadilloIcon src={partner.icon} className='size-8' />
                <span className='truncate font-display text-xl max-[359px]:hidden'>{localize(partner.name, locale)}</span>
              </>
            )}
          </Link>
          <div className='ml-auto flex shrink-0 items-center gap-2'>
            {partner && (
              <Button asChild variant='outline' size='sm' className='h-8 rounded-full text-xs sm:h-9 sm:text-sm'>
                <Link href={partnerPath(partner.slug)} aria-label={t('PARTNER_SEE_MINE')}>
                  {/* Phones: the eye only, so the mercadillo's name keeps its room. */}
                  <Eye /> <span className='max-sm:sr-only'>{t('PARTNER_SEE_MINE')}</span>
                </Link>
              </Button>
            )}
            <LanguageSwitcher variant='compact' className='h-8 gap-1.5 pl-1 pr-2.5 text-xs sm:h-9 sm:text-sm [&>span]:size-6' />
          </div>
        </div>
      </header>
      <main className='container mx-auto flex-1 px-4 py-4 sm:p-8 sm:pt-6'>{children}</main>
    </div>
  );
}
