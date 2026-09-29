import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/page-header';
import { getContactChannels } from '@/components/shared/contact-channels';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('NAV_CONTACT') };
}

export default async function ContactPage() {
  const { t } = await getT();
  const channels = getContactChannels(t);

  if (channels.length === 0) notFound();

  return (
    <section className='mx-auto max-w-2xl space-y-10'>
      <PageHeader
        eyebrow={t('CONTACT_EYEBROW')}
        title={t('CONTACT_HEADING')}
        description={t('CONTACT_INTRO')}
      />

      <div className='space-y-3'>
        {channels.map(({ label, value, href, icon: Icon, external }) => (
          <Link
            key={label}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className='group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-muted/50'
          >
            <span className='flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary'>
              <Icon className='h-5 w-5' />
            </span>
            <span className='flex-1'>
              <span className='block text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                {label}
              </span>
              <span className='block text-base text-foreground'>{value}</span>
            </span>
            <ArrowUpRight className='h-5 w-5 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground' />
          </Link>
        ))}
      </div>

      <Button asChild variant='outline' className='rounded-full'>
        <Link href='/store'>{t('BACK_TO_SHOP')}</Link>
      </Button>
    </section>
  );
}
