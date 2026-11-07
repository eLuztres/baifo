import type { ListingEvent, SubmissionStatus } from '@prisma/client';
import type { TranslationKey, Translator } from '@/lib/i18n-core';
import type { ListingEventAction } from '@/lib/listing-log';
import { adminTexts, statusText } from '@/lib/marketplace/admin-texts';
import type { Locale } from '@/lib/i18n-core';
import { cn, formatDateTime } from '@/lib/utils';

const ACTION_CLASSES: Record<ListingEventAction, string> = {
  created: 'bg-primary text-primary-foreground',
  edited: 'bg-muted text-foreground',
  status: 'bg-accent text-accent-foreground',
  paid: 'bg-primary/15 text-primary',
  scout: 'bg-secondary text-secondary-foreground',
  deleted: 'bg-destructive text-destructive-foreground',
};

type LoggedEvent = Pick<ListingEvent, 'action' | 'changes' | 'snapshot' | 'actorType' | 'actorName'>;

/** "Publicado", "Editado", "Borrado"…: a status change names the new status. */
export function actionLabel(event: LoggedEvent, t: Translator, locale: Locale) {
  if (event.action === 'status') {
    const status = (event.snapshot as { status?: SubmissionStatus }).status;
    return status ? statusText(adminTexts(locale), status) : t('LOG_ACTION_status');
  }
  return t(`LOG_ACTION_${event.action}` as TranslationKey);
}

export function ActionTag({ event, t, locale }: { event: LoggedEvent; t: Translator; locale: Locale }) {
  return (
    <span className={cn('inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', ACTION_CLASSES[event.action as ListingEventAction] ?? ACTION_CLASSES.edited)}>
      {actionLabel(event, t, locale)}
    </span>
  );
}

/** Who did it: the admin's name, the person on their own page, WhatsApp or the shop by itself (AI, daily jobs). */
export function actorLabel(event: LoggedEvent, t: Translator) {
  if (event.actorType === 'admin') return t('LOG_ACTOR_ADMIN', { name: event.actorName ?? '' });
  const label = t(`LOG_ACTOR_${event.actorType.toUpperCase()}` as TranslationKey);
  // WhatsApp also names the number that wrote.
  return event.actorName ? `${label} · ${event.actorName}` : label;
}

// The fields an admin reads first; the rest follow in the snapshot's own order.
export const MAIN_FIELDS = [
  'status',
  'title',
  'description',
  'price',
  'priceMode',
  'type',
  'images',
  'rawImages',
  'tags',
  'place',
  'mercadillo',
  'scout',
  'sellerName',
  'sellerPhone',
  'contactEmail',
  'contactWeb',
  'contactInstagram',
  'hasContactConsent',
  'startsAt',
  'address',
  'expiresAt',
  'paidAt',
  'payClaimedMethod',
  'paymentProvider',
] as const;

export const fieldLabel = (field: string, t: Translator) =>
  (MAIN_FIELDS as readonly string[]).includes(field) ? t(`LOG_FIELD_${field}` as TranslationKey) : field;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const isPicture = (value: unknown): value is string => typeof value === 'string' && /^https?:\/\//.test(value);

/** One field's value as it reads: pictures as thumbnails, dates on the island's clock, texts per language. */
export function FieldValue({ field, value, locale }: { field: string; value: unknown; locale: Locale }) {
  if (value === null || value === undefined || value === '') return <span className='text-muted-foreground'>—</span>;
  if (field === 'status' && typeof value === 'string') return <span>{statusText(adminTexts(locale), value as SubmissionStatus)}</span>;
  if (typeof value === 'boolean') return <span>{value ? '✓' : '✗'}</span>;
  if (typeof value === 'string' && ISO_DATE.test(value)) return <span>{formatDateTime(value, locale).dateTime}</span>;
  if (Array.isArray(value) && value.length > 0 && value.every(isPicture)) {
    return (
      <span className='flex flex-wrap gap-1'>
        {value.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element -- any host the listing used, small thumbnails
          <img key={url} src={url} alt='' className='h-14 w-[2.625rem] rounded-md border border-border object-cover' />
        ))}
      </span>
    );
  }
  if (typeof value === 'object') return <span className='whitespace-pre-wrap break-words font-mono text-xs'>{JSON.stringify(value, null, 1)}</span>;
  return <span className='whitespace-pre-wrap break-words'>{String(value)}</span>;
}
