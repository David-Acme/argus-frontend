import {
  addDays as addDaysBase,
  addMonths as addMonthsBase,
  endOfDay as endOfDayBase,
  format,
  getHours,
  isSameDay,
  isSameMonth,
  parse,
  startOfDay as startOfDayBase,
  startOfMonth as startOfMonthBase,
  startOfWeek,
  setHours,
} from 'date-fns';
import { enAU } from 'date-fns/locale/en-AU';
import { enCA } from 'date-fns/locale/en-CA';
import { enGB } from 'date-fns/locale/en-GB';
import { enIN } from 'date-fns/locale/en-IN';
import { enNZ } from 'date-fns/locale/en-NZ';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import type { CalendarView, LanguageCode } from '@/core/types';
import { DAYS_PER_WEEK, MONTH_GRID_ROWS } from '@/shared/constants/calendar.constant';
import { TIMELINE_HOURS } from '@/shared/constants/dashboard.constant';

type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DeviceDatePreferences = {
  languageTag: string;
  regionCode: string | null;
  uses24hourClock: boolean | null;
  firstWeekday: number | null;
  timeZone: string | null;
};

type AppDateLocale = typeof es | typeof enUS;

export type DateFormatter = {
  formatWeekdayShort: (value: Date) => string;
  formatWeekday: (value: Date) => string;
  formatMonth: (value: Date) => string;
  formatYear: (value: Date) => string;
  formatMonthYear: (value: Date) => string;
  formatDayMonth: (value: Date) => string;
  formatAgendaDay: (value: Date) => string;
  formatFullDate: (value: Date) => string;
  formatPickerDay: (value: Date) => string;
  formatDayNumber: (value: Date) => string;
  formatHour: (hour: number) => string;
  formatTime: (value: Date) => string;
  formatTimeRange: (startsAt: Date, endsAt?: Date | null) => string;
  formatInputTime: (value: Date) => string;
  atInputTime: (day: Date, value: string) => Date;
  defaultInputTime: (day: Date, now?: Date) => string;
  startOfDay: (value: Date) => Date;
  endOfDay: (value: Date) => Date;
  addDays: (value: Date, amount: number) => Date;
  addMonths: (value: Date, amount: number) => Date;
  sameDay: (left: Date, right: Date) => boolean;
  weekDays: (value: Date) => Date[];
  monthGridDays: (value: Date) => Date[];
  rangeFor: (view: CalendarView, anchor: Date) => { from: number; to: number };
  timelineHours: (entryHours: readonly number[]) => number[];
  hourOf: (value: Date) => number;
  minuteOf: (value: Date) => number;
  isSameMonth: (left: Date, right: Date) => boolean;
};

const ENGLISH_LOCALES = {
  AU: enAU,
  CA: enCA,
  GB: enGB,
  IE: enGB,
  IN: enIN,
  NZ: enNZ,
  US: enUS,
} as const;

function dateLocale(language: LanguageCode, regionCode: string | null): AppDateLocale {
  if (language === 'es') return es;
  return ENGLISH_LOCALES[regionCode as keyof typeof ENGLISH_LOCALES] ?? enUS;
}

function weekStartsOn(value: number | null, fallback: number | undefined): WeekStartsOn {
  const deviceValue = value == null ? undefined : value - 1;
  const resolved = deviceValue ?? fallback ?? 0;
  return resolved >= 0 && resolved <= 6 ? (resolved as WeekStartsOn) : 0;
}

function dayPattern(language: LanguageCode): string {
  return language === 'es' ? "EEEE, d 'de' MMMM" : 'EEEE, MMMM d';
}

export function createDateFormatter(
  language: LanguageCode,
  preferences: DeviceDatePreferences
): DateFormatter {
  const locale = dateLocale(language, preferences.regionCode);
  const startsOn = weekStartsOn(preferences.firstWeekday, locale.options?.weekStartsOn);
  const timePattern = (preferences.uses24hourClock ?? language === 'es') ? 'HH:mm' : 'h:mm a';
  const options = { locale, weekStartsOn: startsOn };
  const sentence = (text: string) => text.charAt(0).toLocaleUpperCase(language) + text.slice(1);
  const startDay = (value: Date) => startOfDayBase(value);
  const endDay = (value: Date) => endOfDayBase(value);
  const addDays = (value: Date, amount: number) => addDaysBase(value, amount);
  const weekDays = (value: Date) => {
    const first = startOfWeek(startDay(value), options);
    return Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(first, index));
  };
  const monthGridDays = (value: Date) => {
    const first = startOfWeek(startOfMonthBase(value), options);
    return Array.from({ length: MONTH_GRID_ROWS * DAYS_PER_WEEK }, (_, index) =>
      addDays(first, index)
    );
  };
  const rangeFor = (view: CalendarView, anchor: Date) => {
    if (view === 'day') return { from: startDay(anchor).getTime(), to: endDay(anchor).getTime() };
    if (view === 'week') {
      const days = weekDays(anchor);
      return { from: days[0].getTime(), to: endDay(days.at(-1)!).getTime() };
    }
    if (view === 'month') {
      const days = monthGridDays(anchor);
      return { from: days[0].getTime(), to: endDay(days.at(-1)!).getTime() };
    }
    const start = startDay(anchor);
    return { from: start.getTime(), to: endDay(addDays(start, 30)).getTime() };
  };

  return {
    formatWeekdayShort: (value) => format(value, 'EEE', options).replace('.', ''),
    formatWeekday: (value) => sentence(format(value, 'EEEE', options)),
    formatMonth: (value) => sentence(format(value, 'LLLL', options)),
    formatYear: (value) => format(value, 'yyyy', options),
    formatMonthYear: (value) => sentence(format(value, 'LLLL yyyy', options)),
    formatDayMonth: (value) => format(value, language === 'es' ? 'd MMM' : 'MMM d', options),
    formatAgendaDay: (value) => sentence(format(value, dayPattern(language), options)),
    formatFullDate: (value) => format(value, 'PPPP', options),
    formatPickerDay: (value) => format(value, 'EEE, d MMM', options).replace('.', ''),
    formatDayNumber: (value) => format(value, 'd', options),
    formatHour: (hour) => format(new Date(2000, 0, 1, hour), timePattern, options),
    formatTime: (value) => format(value, timePattern, options),
    formatTimeRange: (startsAt, endsAt) =>
      endsAt
        ? `${format(startsAt, timePattern, options)} – ${format(endsAt, timePattern, options)}`
        : format(startsAt, timePattern, options),
    formatInputTime: (value) => format(value, 'HH:mm', options),
    atInputTime: (day, value) => parse(value, 'HH:mm', day, options),
    defaultInputTime: (day, now = new Date()) => {
      if (!isSameDay(day, now)) return '09:00';
      return format(setHours(now, Math.min(getHours(now) + 1, 23)), 'HH:00', options);
    },
    startOfDay: startDay,
    endOfDay: endDay,
    addDays,
    addMonths: (value, amount) => addMonthsBase(value, amount),
    sameDay: isSameDay,
    weekDays,
    monthGridDays,
    rangeFor,
    timelineHours: (entryHours) => {
      const first =
        entryHours.length > 0 ? Math.min(TIMELINE_HOURS[0], ...entryHours) : TIMELINE_HOURS[0];
      const last =
        entryHours.length > 0
          ? Math.max(TIMELINE_HOURS.at(-1)!, ...entryHours)
          : TIMELINE_HOURS.at(-1)!;
      return Array.from({ length: last - first + 1 }, (_, index) => first + index);
    },
    hourOf: getHours,
    minuteOf: (value) => value.getMinutes(),
    isSameMonth,
  };
}
