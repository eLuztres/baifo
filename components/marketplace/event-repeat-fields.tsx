'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { fromShopDateTime, toShopDateTime } from '@/lib/event-date';
import {
  eventDates,
  formatEventRepeat,
  formatRepeatDate,
  REPEAT_FREQUENCIES,
  toggleEventDay,
  toRepeat,
  upcomingEventDates,
  usualDaysUntil,
  weekdayOf,
  weekOfMonth,
  type RepeatFrequency,
  type RepeatInput,
} from '@/lib/event-repeat';
import { fillText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

const NEXT_SHOWN = 3;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const MONTHS_AHEAD = 24;
// Two months hold at most 62 days: every one of them fits.
const DAYS_IN_TWO_MONTHS = 62;
// A tapped day needs a time to be a date: the evening suits most events, and the date field changes it.
const FIRST_DAY_TIME = '19:00';

interface EventRepeatFieldsProps {
  /** The event's first date, "2026-11-19T19:00"; empty until one is chosen. */
  start: string;
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  value: RepeatInput;
  onChange: (value: RepeatInput) => void;
  /** Called with "2026-11-19T19:00" when a day is tapped while there is no first date yet. */
  onStartChange: (start: string) => void;
  texts: AdminTexts;
  disabled?: boolean;
}

type DayState = 'event' | 'extra' | 'cancelled' | 'skipped' | 'free' | 'off';

const chipClass = (isOn: boolean) =>
  cn(
    'h-9 min-w-0 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition disabled:opacity-50',
    isOn ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary'
  );

const dayClass: Record<DayState, string> = {
  event: 'bg-primary font-bold text-primary-foreground',
  extra: 'bg-primary font-bold text-primary-foreground',
  cancelled: 'text-muted-foreground line-through ring-1 ring-inset ring-primary',
  skipped: 'text-muted-foreground outline-dashed outline-1 -outline-offset-4 outline-muted-foreground/50 hover:bg-muted',
  free: 'hover:bg-muted',
  off: 'text-muted-foreground/40',
};

/** A day in 2024 that was a Monday, so `weekday` days later is that weekday. */
const weekdayDate = (weekday: number) => new Date(Date.UTC(2024, 0, 1 + weekday));
const dayOf = (year: number, month: number, date: number) => new Date(Date.UTC(year, month, date)).toISOString().slice(0, 10);

/** "☐ Se repite" under an event's date; ticked: how often (one tap), and a calendar where a tap on a day cancels a
    usual date or adds one; without a first date yet, the day tapped becomes it. "Elegir fechas" is only the dates tapped. */
export default function EventRepeatFields({ start, isOn, onToggle, value, onChange, onStartChange, texts, disabled }: EventRepeatFieldsProps) {
  const { t, locale } = useI18n();
  const [monthOffset, setMonthOffset] = useState(0);
  const startDate = start ? fromShopDateTime(start) : null;
  const firstDay = start.slice(0, 10);
  const rule = startDate ? toRepeat(startDate, value) : null;
  const today = toShopDateTime(new Date()).slice(0, 10);
  const set = (changes: Partial<RepeatInput>) => onChange({ ...value, ...changes });
  const weekdays = value.weekdays.length > 0 ? value.weekdays : firstDay ? [weekdayOf(firstDay)] : [];
  const toggleWeekday = (weekday: number) =>
    // One day at least: the last one can't be taken away.
    set({ weekdays: weekdays.includes(weekday) ? (weekdays.length > 1 ? weekdays.filter((day) => day !== weekday) : weekdays) : [...weekdays, weekday] });
  const weekdayName = (weekday: number, style: 'long' | 'narrow') => weekdayDate(weekday).toLocaleDateString(locale, { weekday: style, timeZone: 'UTC' });
  const monthName = (year: number, month: number) => {
    const name = new Date(Date.UTC(year, month, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  const dayNames = new Intl.ListFormat(locale, { type: 'conjunction' }).format([...weekdays].sort((a, b) => a - b).map((day) => weekdayName(day, 'long')));

  const subLabel = (frequency: RepeatFrequency) => {
    if (!firstDay) return '';
    if (frequency === 'weekly') return dayNames;
    if (frequency === 'biweekly') return fillText(texts.repeatBiweeklyDays, { days: dayNames });
    if (frequency === 'monthly') return fillText(texts.repeatMonthlyWeekday, { nth: t(`EVENT_NTH_${weekOfMonth(firstDay)}` as 'EVENT_NTH_0'), weekday: weekdayName(weekdayOf(firstDay), 'long') });
    return texts.repeatCustomHint;
  };

  // The calendar opens on the month of the next date: the first one, or today's.
  const opening = firstDay > today ? firstDay : today;
  const months = [0, 1].map((shift) => {
    const month = Number(opening.slice(5, 7)) - 1 + monthOffset + shift;
    return { year: Number(opening.slice(0, 4)) + Math.floor(month / 12), month: ((month % 12) + 12) % 12 };
  });
  const firstShown = dayOf(months[0].year, months[0].month, 1);
  const lastShown = dayOf(months[1].year, months[1].month + 1, 0);
  const shown = rule ? eventDates(rule, firstShown, DAYS_IN_TWO_MONTHS) : [];
  const usual = rule ? usualDaysUntil(rule, lastShown) : new Set<string>();
  const stateOf = (day: string): DayState => {
    const date = shown.find((each) => (each.isCancelled ? each.day : each.startsAt.slice(0, 10)) === day);
    if (date) return date.isCancelled ? 'cancelled' : date.isExtra ? 'extra' : 'event';
    const isTappable = day >= today && day >= firstDay && !(rule && value.until && day > value.until);
    if (!isTappable) return 'off';
    const isSkipped = rule !== null && value.frequency === 'biweekly' && weekdays.includes(weekdayOf(day)) && !usual.has(day);
    return isSkipped ? 'skipped' : 'free';
  };
  // The calendar then opens on the tapped day's month, so the offset starts again from there.
  const pickFirstDay = (day: string) => {
    setMonthOffset(0);
    onStartChange(`${day}T${FIRST_DAY_TIME}`);
  };
  const next = rule ? upcomingEventDates(rule, NEXT_SHOWN + Object.keys(value.changes).length).filter((date) => !date.isCancelled).slice(0, NEXT_SHOWN) : [];

  return (
    <div className='space-y-3 sm:col-span-2'>
      <label className='flex h-12 w-fit cursor-pointer items-center gap-3 rounded-2xl bg-card px-3 text-sm font-medium'>
        <Checkbox checked={isOn} disabled={disabled} onCheckedChange={(checked) => onToggle(checked === true)} />
        <Repeat className='size-4 text-primary' aria-hidden /> {texts.repeatToggle}
      </label>

      {isOn && (
        <div className='max-w-2xl space-y-3 rounded-2xl border border-border bg-card p-3'>
          <div role='radiogroup' aria-label={texts.repeatToggle} className='grid gap-1.5'>
            {REPEAT_FREQUENCIES.map((frequency) => {
              const isChosen = value.frequency === frequency;
              return (
                <div key={frequency}>
                  <button
                    type='button'
                    role='radio'
                    aria-checked={isChosen}
                    disabled={disabled}
                    onClick={() => set({ frequency, monthlyBy: 'weekday' })}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-sm transition disabled:opacity-50',
                      isChosen ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
                    )}
                  >
                    <span className={cn('size-[18px] shrink-0 rounded-full border-2', isChosen ? 'border-[5px] border-primary' : 'border-border')} aria-hidden />
                    <span className='min-w-0'>
                      <span className='font-semibold'>{texts[`repeat_${frequency}`]}</span>
                      {subLabel(frequency) && <span className='text-muted-foreground'> · {subLabel(frequency)}</span>}
                    </span>
                  </button>
                  {isChosen && (frequency === 'weekly' || frequency === 'biweekly') && (
                    <div role='group' aria-label={texts.repeatWeekdays} className='ml-7 mt-1.5 flex max-w-xs gap-1'>
                      {WEEKDAYS.map((weekday) => (
                        <button
                          key={weekday}
                          type='button'
                          aria-pressed={weekdays.includes(weekday)}
                          aria-label={weekdayName(weekday, 'long')}
                          disabled={disabled}
                          onClick={() => toggleWeekday(weekday)}
                          className={cn(chipClass(weekdays.includes(weekday)), 'h-8 flex-1 px-0 text-xs uppercase')}
                        >
                          {weekdayName(weekday, 'narrow')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {rule && (
            <div className='flex items-start gap-2 px-1 text-sm'>
              <Repeat className='mt-0.5 size-4 shrink-0 text-primary' aria-hidden />
              <p>
                <span className='font-semibold'>{formatEventRepeat(rule, locale, t)}</span>
                {next.length > 0 && (
                  <span className='block text-muted-foreground'>{fillText(texts.repeatNext, { dates: next.map((date) => formatRepeatDate(date, locale, t('EVENT_TODAY'))).join(', ') })}</span>
                )}
              </p>
            </div>
          )}

          <div className='relative'>
            <div className='absolute right-0 top-0 flex gap-1'>
              <button type='button' aria-label={texts.repeatPrevMonth} disabled={monthOffset === 0} onClick={() => setMonthOffset(monthOffset - 1)} className='grid size-8 place-items-center rounded-full hover:bg-muted disabled:opacity-30'>
                <ChevronLeft className='size-4' aria-hidden />
              </button>
              <button type='button' aria-label={texts.repeatNextMonth} disabled={monthOffset >= MONTHS_AHEAD} onClick={() => setMonthOffset(monthOffset + 1)} className='grid size-8 place-items-center rounded-full hover:bg-muted disabled:opacity-30'>
                <ChevronRight className='size-4' aria-hidden />
              </button>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              {months.map(({ year, month }, index) => {
                const blanks = weekdayOf(dayOf(year, month, 1));
                const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
                return (
                  <div key={`${year}-${month}`} className={cn(index === 1 && 'hidden sm:block')}>
                    <p className='mb-1 flex h-8 items-center px-1 text-sm font-semibold'>{monthName(year, month)}</p>
                    <div className='grid grid-cols-7 gap-0.5 text-center'>
                      {WEEKDAYS.map((weekday) => (
                        <span key={weekday} className='pb-0.5 text-[11px] uppercase text-muted-foreground'>
                          {weekdayName(weekday, 'narrow')}
                        </span>
                      ))}
                      {Array.from({ length: blanks }, (_, blank) => (
                        <span key={`blank-${blank}`} />
                      ))}
                      {Array.from({ length: days }, (_, index) => {
                        const day = dayOf(year, month, index + 1);
                        const state = stateOf(day);
                        const isTappable = state !== 'off' && day >= today;
                        return (
                          <button
                            key={day}
                            type='button'
                            disabled={disabled || !isTappable}
                            aria-pressed={state === 'event' || state === 'extra'}
                            aria-current={day === today ? 'date' : undefined}
                            aria-label={new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                            onClick={() => (rule ? set({ changes: toggleEventDay(rule, day) }) : pickFirstDay(day))}
                            className={cn('relative mx-auto grid size-8 place-items-center rounded-full text-[13px] transition disabled:cursor-default', dayClass[state])}
                          >
                            {index + 1}
                            {state === 'extra' && <span className='absolute -right-0.5 -top-1 text-[11px] font-extrabold text-primary' aria-hidden>+</span>}
                            {day === today && <span className='absolute bottom-1 size-1 rounded-full bg-current' aria-hidden />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {rule && (
            <div className='flex flex-wrap gap-x-3.5 gap-y-1 px-1 text-xs text-muted-foreground'>
              <span className='flex items-center gap-1'>
                <i className='size-3 rounded-full bg-primary' aria-hidden /> {texts.repeatLegendEvent}
              </span>
              {value.frequency === 'biweekly' && (
                <span className='flex items-center gap-1'>
                  <i className='size-3 rounded-full outline-dashed outline-1 outline-muted-foreground/60' aria-hidden /> {texts.repeatLegendSkipped}
                </span>
              )}
              <span className='flex items-center gap-1'>
                <i className='size-3 rounded-full ring-1 ring-inset ring-primary' aria-hidden /> {texts.repeatLegendCancelled}
              </span>
              <span className='flex items-center gap-1'>
                <b className='text-primary'>+</b> {texts.repeatLegendExtra}
              </span>
            </div>
          )}

          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='px-1 text-xs text-muted-foreground'>{texts.repeatUntil}</span>
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
              <button
                type='button'
                disabled={disabled || !rule}
                onClick={() => set({ until: (rule && upcomingEventDates(rule, 6).at(-1)?.day) || firstDay })}
                className={chipClass(false)}
              >
                {texts.repeatEndDate}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
