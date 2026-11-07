import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { ActionTag, actorLabel } from '@/components/admin/listing-log-parts';
import { Input } from '@/components/ui/input';
import { requireAdmin } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';
import { formatDateTime } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('LOG_TITLE') };
}

// The latest events are enough to fill the list; each listing's page reads all of its own.
const EVENT_WINDOW = 3000;
const LISTING_LIMIT = 150;

interface ListingsLogPageProps {
  searchParams: Promise<{ q?: string }>;
}

/** Every listing's life at a glance, newest change first: created → edited → published → … → deleted. */
export default async function ListingsLogPage({ searchParams }: ListingsLogPageProps) {
  await requireAdmin();
  const [{ q = '' }, { t, locale }] = await Promise.all([searchParams, getT()]);
  const search = q.trim();
  const events = await prisma.listingEvent.findMany({
    where: search
      ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { actorName: { contains: search, mode: 'insensitive' } }, { snapshot: { path: ['scout'], string_contains: search } }] }
      : {},
    orderBy: { createdAt: 'desc' },
    take: EVENT_WINDOW,
    select: { id: true, submissionId: true, action: true, title: true, actorType: true, actorName: true, changes: true, snapshot: true, createdAt: true },
  });
  // Grouped per listing, newest change first; each group's events oldest first, like its life went.
  const listings = [...Map.groupBy(events, (event) => event.submissionId).entries()].slice(0, LISTING_LIMIT).map(([id, group]) => ({ id, events: group.reverse() }));

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('LOG_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('LOG_INTRO')}</p>
      </div>
      <form className='max-w-md'>
        <Input name='q' defaultValue={search} placeholder={t('LOG_SEARCH')} className='rounded-full' />
      </form>
      {listings.length === 0 ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{t('LOG_EMPTY')}</p>
      ) : (
        <ul className='space-y-3'>
          {listings.map(({ id, events: group }) => {
            const last = group[group.length - 1];
            return (
              <li key={id}>
                <Link href={`/admin/listings-log/${id}`} className='block space-y-2 rounded-2xl border border-border bg-card p-3 hover:bg-muted/50'>
                  <div className='flex flex-col gap-x-3 sm:flex-row sm:items-baseline sm:justify-between'>
                    <p className='min-w-0 truncate font-medium'>{last.title || t('LOG_UNTITLED')}</p>
                    <p className='shrink-0 text-xs text-muted-foreground'>
                      {formatDateTime(last.createdAt, locale).dateTime} · {actorLabel(last, t)}
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-1'>
                    {group.map((event) => (
                      <ActionTag key={event.id} event={event} t={t} locale={locale} />
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
