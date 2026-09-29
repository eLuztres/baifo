import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { getNavLinks } from '@/components/shared/header';
import BrandLogo from '@/components/shared/brand-logo';
import { getContactChannels } from '@/components/shared/contact-channels';

const Footer = async () => {
  const { t } = await getT();
  const currentYear = new Date().getFullYear();
  const channels = getContactChannels(t);

  return (
    <footer className='mt-24 border-t border-border bg-muted/40'>
      <div className='wrapper grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]'>
        <div className='space-y-4'>
          <BrandLogo withName />
          <p className='max-w-xs text-sm leading-6 text-muted-foreground'>
            {t('FOOTER_TAGLINE')}
          </p>
        </div>

        <div>
          <h3 className='mb-4 font-sans text-xs font-medium uppercase tracking-[0.3em] text-foreground/60'>
            {t('FOOTER_EXPLORE')}
          </h3>
          <ul className='space-y-2 text-sm'>
            {getNavLinks(t).map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className='text-muted-foreground transition hover:text-foreground'
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {channels.length > 0 && (
          <div>
            <h3 className='mb-4 font-sans text-xs font-medium uppercase tracking-[0.3em] text-foreground/60'>
              {t('FOOTER_CONTACT')}
            </h3>
            <ul className='space-y-3 text-sm'>
              {channels.map(({ label, value, href, icon: Icon, external }) => (
                <li key={label}>
                  <Link
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className='flex items-center gap-3 text-muted-foreground transition hover:text-foreground'
                  >
                    <Icon className='h-4 w-4' />
                    {value}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className='border-t border-border'>
        <div className='wrapper py-6 text-xs text-muted-foreground'>
          © {currentYear} {BRAND.name}. {t('FOOTER_RIGHTS')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
