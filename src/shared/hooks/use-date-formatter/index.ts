import { useCalendars, useLocales } from 'expo-localization';
import { useMemo } from 'react';
import { useLocaleStore } from '@/core/stores';
import {
  createDateFormatter,
  type DateFormatter,
  type DeviceDatePreferences,
} from '@/shared/hooks/use-date-formatter/date';

export function useDateFormatter(): DateFormatter {
  const language = useLocaleStore((state) => state.language);
  const [deviceLocale] = useLocales();
  const [deviceCalendar] = useCalendars();

  return useMemo(
    () =>
      createDateFormatter(language, {
        languageTag: deviceLocale.languageTag,
        regionCode: deviceLocale.regionCode,
        uses24hourClock: deviceCalendar.uses24hourClock,
        firstWeekday: deviceCalendar.firstWeekday,
        timeZone: deviceCalendar.timeZone,
      } satisfies DeviceDatePreferences),
    [
      language,
      deviceCalendar.firstWeekday,
      deviceCalendar.timeZone,
      deviceCalendar.uses24hourClock,
      deviceLocale.languageTag,
      deviceLocale.regionCode,
    ]
  );
}
