import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/db/prisma';
import { ActionTag, actorLabel, FieldValue, fieldLabel, MAIN_FIELDS } from '@/components/admin/listing-log-parts';
import { requireAdmin } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';
import { formatDateTime } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('LOG_TITLE') };
}

// Ids (scoutId, productId…) say the same as the names next to them, so they stay out of sight.
const isShown = (field: string) => field === 'id' || !field.endsWith('Id');

// The fields shown first in a snapshot; the rest follow.
const fieldOrder = (snapshot: Record<string, unknown>) => [
  ...MAIN_FIELDS.filter((field) => field in snapshot),
  ...Object.keys(snapshot).filter((field) => !(MAIN_FIELDS as readonly string[]).includes(field) && isShown(field)),
];

/** One listing's whole life: each point with who, when, what changed and the whole listing as it was then. */
export default async function ListingHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const [{ id }, { t, locale }] = await Promise.all([params, getT()]);
  const [events, listing] = await Promise.all([
    prisma.listingEvent.findMany({ where: { submissionId: id }, orderBy: { createdAt: 'asc' } }),
    prisma.submission.findUnique({ where: { id }, select: { id: true } }).catch(() => null),
  ]);
  if (events.length === 0) notFound();
  const title = events.findLast((event) => event.title)?.title ?? t('LOG_UNTITLED');

  return (
    <div className='space-y-6'>
      <Link href='/admin/listings-log' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline'>
        <ArrowLeft className='size-4' /> {t('LOG_TITLE')}
      </Link>
      <div className='space-y-1'>
        <h2 className='h2-bold break-words'>{title}</h2>
        {listing ? (
          <Link href={`/admin/listings/${id}`} className='text-sm text-primary hover:underline'>
            {t('LOG_OPEN_LISTING')}
          </Link>
        ) : (
          <p className='text-sm text-muted-foreground'>{t('LOG_LISTING_GONE')}</p>
        )}
      </div>
      <ol className='space-y-4 border-l-2 border-border pl-4'>
        {events.map((event) => {
          const changes = Object.entries(event.changes as Record<string, [unknown, unknown]>).filter(([field]) => isShown(field));
          const snapshot = event.snapshot as Record<string, unknown>;
          return (
            <li key={event.id} className='relative space-y-3 rounded-2xl border border-border bg-card p-3'>
              <span className='absolute -left-[1.4rem] top-4 size-3 rounded-full bg-primary' aria-hidden />
              <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                <ActionTag event={event} t={t} locale={locale} />
                <span className='font-medium'>{formatDateTime(event.createdAt, locale).dateTime}</span>
                <span className='text-sm text-muted-foreground'>{actorLabel(event, t)}</span>
              </div>
              {changes.length > 0 && (
                <dl className='grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm'>
                  {changes.map(([field, [before, after]]) => (
                    <div key={field} className='contents'>
                      <dt className='text-muted-foreground'>{fieldLabel(field, t)}</dt>
                      <dd className='min-w-0 space-y-1'>
                        <div className='rounded-md bg-destructive/10 px-1.5 line-through decoration-destructive/50'>
                          <FieldValue field={field} value={before} locale={locale} />
                        </div>
                        <div className='rounded-md bg-primary/10 px-1.5'>
                          <FieldValue field={field} value={after} locale={locale} />
                        </div>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <details className='group'>
                <summary className='cursor-pointer text-sm text-primary'>{t(event.action === 'deleted' ? 'LOG_SNAPSHOT_DELETED' : 'LOG_SNAPSHOT')}</summary>
                <dl className='mt-2 grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm'>
                  {fieldOrder(snapshot).map((field) => (
                    <div key={field} className='contents'>
                      <dt className='text-muted-foreground'>{fieldLabel(field, t)}</dt>
                      <dd className={changes.some(([changed]) => changed === field) ? 'min-w-0 rounded-md bg-primary/10 px-1.5' : 'min-w-0'}>
                        <FieldValue field={field} value={snapshot[field]} locale={locale} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
