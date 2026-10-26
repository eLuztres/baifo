import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { getContactChannels } from '@/components/shared/contact-channels';
import { APP_NAME } from '@/lib/constants';
import { hasContactInfo } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { SECTION_IDS } from './one-page';

/** Contact in one row of small links, and the classifieds' rules folded until tapped. */
export default async function CompactContact() {
  const { t } = await getT();
  if (!hasContactInfo) return null;
  const channels = getContactChannels(t);
  const rules = [
    { title: t('CONTACT_RULES_NOT_A_SHOP'), text: t('CONTACT_RULES_NOT_A_SHOP_TEXT', { shop: APP_NAME }) },
    { title: t('CONTACT_RULES_RING'), text: t('HOME_FAQ_1_A') },
    { title: t('CONTACT_RULES_CUSTOM'), text: t('HOME_FAQ_2_A') },
  ];

  return (
    <section id={SECTION_IDS.contact} aria-labelledby='home-contact-title' className='space-y-3'>
      <h2 id='home-contact-title' className='font-display text-2xl sm:text-3xl'>
        {t('CONTACT_HEADING')}
      </h2>
      <div className='flex flex-wrap gap-2'>
        {channels.map(({ label, value, href, icon: Icon, external }) => (
          <Link
            key={label}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            aria-label={`${label}: ${value}`}
            className='inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-muted/50'
          >
            <Icon className='size-4 shrink-0 text-primary' aria-hidden='true' />
            <span className='truncate'>{value}</span>
          </Link>
        ))}
      </div>
      <details className='group rounded-2xl border border-border bg-card'>
        <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden'>
          {t('CONTACT_RULES_TITLE_SHOWCASE')}
          <ChevronDown className='size-4 shrink-0 transition group-open:rotate-180' aria-hidden='true' />
        </summary>
        <dl className='space-y-3 border-t border-border px-4 py-3 text-sm'>
          {rules.map(({ title, text }) => (
            <div key={title} className='space-y-0.5'>
              <dt className='font-medium'>{title}</dt>
              <dd className='leading-6 text-muted-foreground'>{text}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
