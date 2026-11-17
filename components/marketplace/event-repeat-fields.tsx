'use client';

import { useState } from 'react';
import { Pencil, Repeat, RotateCcw, X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { fromShopDateTime } from '@/lib/event-date';
import {
  formatEventRepeat,
  formatRepeatDate,
  REPEAT_FREQUENCIES,
  toRepeat,
  upcomingEventDates,
  weekdayOf,
  weekOfMonth,
  type RepeatInput,
} from '@/lib/event-repeat';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

const SHOWN_DATES = 6;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

interface EventRepeatFieldsProps {
  /** The event's first date, "2026-11-19T19:00"; empty until one is chosen. */
  start: string;
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  value: RepeatInput;
  onChange: (value: RepeatInput) => void;
  texts: AdminTexts;
  disabled?: boolean;
}

const chipClass = (isOn: boolean) =>
  cn(
    'h-9 min-w-0 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition disabled:opacity-50',
    isOn ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary'
  );

/** A day in 2024 that was a Monday, so `weekday` days later is that weekday. */
const weekdayDate = (weekday: number) => new Date(Date.UTC(2024, 0, 1 + weekday));

/** "☐ Se repite" under an event's date; ticked, the choices fold out: how often, which days, until when, and the next
    dates, each one to change or cancel. Unticked, they fold away and nothing repeats. */
export default function EventRepeatFields({ start, isOn, onToggle, value, onChange, texts, disabled }: EventRepeatFieldsProps) {
  const { t, locale } = useI18n();
  const [movingDay, setMovingDay] = useState<string | null>(null);
  const startDate = start ? fromShopDateTime(start) : null;
  const firstDay = start.slice(0, 10);
  const rule = startDate ? toRepeat(startDate, value) : null;
  const dates = rule ? upcomingEventDates(rule, SHOWN_DATES) : [];
  const set = (changes: Partial<RepeatInput>) => onChange({ ...value, ...changes });
  const weekdays = value.weekdays.length > 0 ? value.weekdays : firstDay ? [weekdayOf(firstDay)] : [];
  const toggleWeekday = (weekday: number) =>
    // One day at least: the last one can't be taken away.
    set({ weekdays: weekdays.includes(weekday) ? (weekdays.length > 1 ? weekdays.filter((day) => day !== weekday) : weekdays) : [...weekdays, weekday] });
  const changeDate = (day: string, change: string | null | undefined) => {
    const others = Object.fromEntries(Object.entries(value.changes).filter(([changed]) => changed !== day));
    set({ changes: change === undefined ? others : { ...others, [day]: change } });
  };
  const weekdayName = (weekday: number, style: 'long' | 'narrow') => weekdayDate(weekday).toLocaleDateString(locale, { weekday: style, timeZone: 'UTC' });

  return (
    <div className='space-y-3 sm:col-span-2'>
      <label className='flex h-12 w-fit cursor-pointer items-center gap-3 rounded-2xl bg-card px-3 text-sm font-medium'>
        <Checkbox checked={isOn} disabled={disabled} onCheckedChange={(checked) => onToggle(checked === true)} />
        <Repeat className='size-4 text-primary' aria-hidden /> {texts.repeatToggle}
      </label>

      {isOn && (
        <>
          <div className='flex max-w-md flex-wrap gap-1'>
            {REPEAT_FREQUENCIES.map((frequency) => (
              <button
                key={frequency}
                type='button'
                aria-pressed={value.frequency === frequency}
                disabled={disabled}
                onClick={() => set({ frequency })}
                className={cn(chipClass(value.frequency === frequency), 'flex-auto px-2 text-[0.8rem] sm:text-sm')}
              >
                {texts[`repeat_${frequency}`]}
              </button>
            ))}
          </div>

          {value.frequency !== 'monthly' ? (
            <div className='space-y-1'>
              <p className='px-1 text-xs text-muted-foreground'>{texts.repeatWeekdays}</p>
              <div className='flex max-w-xs gap-1'>
                {WEEKDAYS.map((weekday) => (
                  <button
                    key={weekday}
                    type='button'
                    aria-pressed={weekdays.includes(weekday)}
                    aria-label={weekdayName(weekday, 'long')}
                    disabled={disabled}
                    onClick={() => toggleWeekday(weekday)}
                    className={cn(chipClass(weekdays.includes(weekday)), 'flex-1 px-0 uppercase')}
                  >
                    {weekdayName(weekday, 'narrow')}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            firstDay && (
              <div className='flex flex-wrap gap-1.5'>
                <button type='button' aria-pressed={value.monthlyBy === 'weekday'} disabled={disabled} onClick={() => set({ monthlyBy: 'weekday' })} className={chipClass(value.monthlyBy === 'weekday')}>
                  {fillText(texts.repeatMonthlyWeekday, { nth: t(`EVENT_NTH_${weekOfMonth(firstDay)}` as 'EVENT_NTH_0'), weekday: weekdayName(weekdayOf(firstDay), 'long') })}
                </button>
                <button type='button' aria-pressed={value.monthlyBy === 'day'} disabled={disabled} onClick={() => set({ monthlyBy: 'day' })} className={chipClass(value.monthlyBy === 'day')}>
                  {fillText(texts.repeatMonthlyDay, { day: Number(firstDay.slice(8, 10)) })}
                </button>
              </div>
            )
          )}

          <div className='space-y-1'>
            <p className='px-1 text-xs text-muted-foreground'>{texts.repeatUntil}</p>
            <div className='flex items-center gap-1.5'>
              <button type='button' aria-pressed={!value.until} disabled={disabled} onClick={() => set({ until: '' })} className={chipClass(!value.until)}>
                {texts.repeatNoEnd}
              </button>
              {value.until ? (
                <Input
                  type='date'
                  aria-label={texts.repeatUntil}
                  value={value.until}
                  min={firstDay}
                  disabled={disabled}
                  onChange={(event) => set({ until: event.target.value })}
                  className='h-9 w-auto min-w-0 rounded-full border-primary bg-card'
                />
              ) : (
                <button type='button' disabled={disabled || !firstDay} onClick={() => set({ until: dates.at(-1)?.day ?? firstDay })} className={chipClass(false)}>
                  {texts.repeatEndDate}
                </button>
              )}
            </div>
          </div>

          {rule && (
            <p className='flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-medium'>
              <Repeat className='size-4 shrink-0 text-primary' aria-hidden /> {formatEventRepeat(rule, locale, t)}
            </p>
          )}

          {dates.length > 0 && (
            <div className='space-y-1'>
              <p className='px-1 text-xs text-muted-foreground'>{texts.repeatDates}</p>
              <ul className='max-w-md divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card'>
                {dates.map((date) => (
                  <li key={date.day} className='flex min-h-12 items-center gap-1 py-1.5 pl-3 pr-1 text-sm'>
                    {movingDay === date.day ? (
                      <Input
                        type='datetime-local'
                        autoFocus
                        aria-label={texts.repeatMove}
                        defaultValue={date.startsAt}
                        min={`${firstDay}T00:00`}
                        max={value.until ? `${value.until}T23:59` : undefined}
                        onBlur={(event) => {
                          const moved = event.target.value;
                          // Back on its usual time: no change kept.
                          changeDate(date.day, !moved || moved === `${date.day}T${start.slice(11, 16)}` ? undefined : moved);
                          setMovingDay(null);
                        }}
                        className='h-9 min-w-0 flex-1 rounded-full'
                      />
                    ) : (
                      <span className={cn('min-w-0 flex-1 truncate', date.isCancelled && 'text-muted-foreground line-through')}>
                        {formatRepeatDate(date, locale, t('EVENT_TODAY'))}
                        {date.isMoved && <span className='ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'>{texts.repeatMoved}</span>}
                      </span>
                    )}
                    {date.isCancelled ? (
                      <button
                        type='button'
                        title={texts.repeatRestore}
                        disabled={disabled}
                        onClick={() => changeDate(date.day, undefined)}
                        className='inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium text-primary'
                      >
                        {texts.repeatCancelled} <RotateCcw className='size-3.5' aria-hidden /> <span className='sr-only'>{texts.repeatRestore}</span>
                      </button>
                    ) : (
                      movingDay !== date.day && (
                        <>
                          <button type='button' aria-label={texts.repeatMove} title={texts.repeatMove} disabled={disabled} onClick={() => setMovingDay(date.day)} className='grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted'>
                            <Pencil className='size-4' aria-hidden />
                          </button>
                          <button type='button' aria-label={texts.repeatCancel} title={texts.repeatCancel} disabled={disabled} onClick={() => changeDate(date.day, null)} className='grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted'>
                            <X className='size-4' aria-hidden />
                          </button>
                        </>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
