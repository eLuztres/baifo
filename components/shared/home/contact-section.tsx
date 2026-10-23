import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/shared/page-header';
import { getContactChannels } from '@/components/shared/contact-channels';
import { APP_NAME, FREE_SHIPPING_THRESHOLD, PAYMENT_METHODS, SHIPPING_PRICE, SHOWCASE_MODE } from '@/lib/constants';
import { hasContactInfo } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { cn, formatCurrency, paymentMethodLabel } from '@/lib/utils';
import { SECTION_IDS } from './one-page';
import styles from './one-page.module.css';

export default async function ContactSection() {
  const { t } = await getT();
  const channels = getContactChannels(t);

  // The menu links here whenever .env has contact details, so hiding them all keeps the rules showing.
  if (!hasContactInfo) return null;

  const prices = { shipping: formatCurrency(SHIPPING_PRICE), threshold: formatCurrency(FREE_SHIPPING_THRESHOLD) };
  const methods = PAYMENT_METHODS.map((method) => paymentMethodLabel(t, method)).join(', ');
  // The answers are the shop's own FAQ texts, so the rules are written in one place.
  // Showcase mode sells nothing, so paying and shipping don't apply, and the notice says so first.
  const rules = [
    ...(SHOWCASE_MODE ? [{ title: t('CONTACT_RULES_NOT_A_SHOP'), text: t('CONTACT_RULES_NOT_A_SHOP_TEXT', { shop: APP_NAME }) }] : []),
    { title: t('CONTACT_RULES_RING'), text: t('HOME_FAQ_1_A') },
    ...(SHOWCASE_MODE
      ? []
      : [
          { title: t('CONTACT_RULES_PAY'), text: t('CONTACT_RULES_PAY_TEXT', { methods }) },
          { title: t('CONTACT_RULES_SHIPPING'), text: t('HOME_FAQ_3_A', prices) },
        ]),
    { title: t('CONTACT_RULES_CUSTOM'), text: t('HOME_FAQ_2_A') },
  ];

  return (
    <section id={SECTION_IDS.contact} className={cn('mx-auto max-w-2xl gap-4 sm:gap-6', styles.section, styles.fitScreen, styles.growWhenShort)}>
      <PageHeader
        as='h2'
        className='shrink-0'
        eyebrow={t('CONTACT_EYEBROW')}
        title={t('CONTACT_HEADING')}
        description={t(SHOWCASE_MODE ? 'CONTACT_INTRO_SHOWCASE' : 'CONTACT_INTRO')}
      />

      <div className='shrink-0 space-y-2'>
        {channels.map(({ label, value, href, icon: Icon, external }) => (
          <Link
            key={label}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className='group flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-2.5 transition hover:border-primary/40 hover:bg-muted/50 sm:py-3'
          >
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary sm:h-10 sm:w-10'>
              <Icon className='h-5 w-5' />
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                {label}
              </span>
              <span className='block truncate text-base text-foreground'>{value}</span>
            </span>
            <ArrowUpRight className='h-5 w-5 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground' />
          </Link>
        ))}
      </div>

      <div className='flex min-h-0 flex-col gap-3'>
        <h3 className='shrink-0 font-display text-xl sm:text-2xl'>{t(SHOWCASE_MODE ? 'CONTACT_RULES_TITLE_SHOWCASE' : 'CONTACT_RULES_TITLE')}</h3>
        {/* The rules swipe sideways, so contact stays one screen tall. Sideways only, so the page still turns on up and down. */}
        <ol className='flex min-h-0 snap-x gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none]'>
          {rules.map(({ title, text }, index) => (
            <li
              key={title}
              className='flex w-[88%] shrink-0 snap-start gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 sm:w-[calc(50%-0.375rem)] sm:gap-4 sm:p-5'
            >
              <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm text-primary sm:h-8 sm:w-8'>
                {index + 1}
              </span>
              <span className='space-y-1'>
                <span className='block text-base text-foreground'>{title}</span>
                <span className='block text-sm leading-6 text-muted-foreground'>{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
