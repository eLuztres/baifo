import { Repeat } from 'lucide-react';
import { formatEventRepeat, formatRepeatDate, upcomingEventDates, type EventRepeat } from '@/lib/event-repeat';
import type { Translator } from '@/lib/i18n-core';
import { cn } from '@/lib/utils';

const SHOWN_DATES = 4;

interface EventRepeatDatesProps {
  repeat: EventRepeat;
  locale: string;
  t: Translator;
  className?: string;
}

/** A repeating event's rule and its next dates: a cancelled one struck through, a changed one marked. */
export default function EventRepeatDates({ repeat, locale, t, className }: EventRepeatDatesProps) {
  const dates = upcomingEventDates(repeat, SHOWN_DATES);
  return (
    <div className={cn('space-y-1.5 text-sm', className)}>
      <p className='flex items-center gap-1.5 font-medium'>
        <Repeat className='size-4 shrink-0 text-primary' aria-hidden /> {formatEventRepeat(repeat, locale, t)}
      </p>
      {dates.length > 1 && (
        <>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{t('EVENT_UPCOMING_DATES')}</p>
          <ul className='space-y-1'>
            {dates.map((date) => (
              <li key={date.day} className={cn('flex flex-wrap items-center gap-x-2', date.isCancelled && 'text-muted-foreground')}>
                <span className={cn(date.isCancelled && 'line-through')}>{formatRepeatDate(date, locale, t('EVENT_TODAY'))}</span>
                {date.isCancelled && <span className='rounded-full bg-muted px-2 py-0.5 text-xs'>{t('EVENT_DATE_CANCELLED')}</span>}
                {date.isMoved && <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'>{t('EVENT_DATE_MOVED')}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
