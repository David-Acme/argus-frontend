import type { GuardExpectedGuest, TranslateFn } from '@/core/types';
import { calendarDaysBetween } from '@/features/security/model/moment';

export type VisitFormat = {
  t: TranslateFn;
  time: (value: Date) => string;
  day: (value: Date) => string;
};

export function visitMeta(
  guest: Pick<GuardExpectedGuest, 'validUntil'>,
  now: number,
  { t, time, day }: VisitFormat
): string {
  const until = guest.validUntil * 1000;
  if (until <= now) return t('screens.security.guests.expired');
  const at = new Date(until);
  if (calendarDaysBetween(now, until) === 0)
    return t('screens.security.visits-screen.today', { time: time(at) });
  return t('screens.security.visits-screen.later', { day: day(at), time: time(at) });
}
