import type { TranslationKey } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleLabelOf } from '@/shared/libs/role-label';
import type { PersonLine } from '@/features/people/model/people';
import type { PresenceView } from '@/features/people/model/presence';

type PresenceKeys = {
  bare: TranslationKey;
  today: 'screens.users.presence.home-since' | 'screens.users.presence.away-since';
  day: 'screens.users.presence.home-day' | 'screens.users.presence.away-day';
};

const HOME: PresenceKeys = {
  bare: 'screens.users.presence.home',
  today: 'screens.users.presence.home-since',
  day: 'screens.users.presence.home-day',
};

const AWAY: PresenceKeys = {
  bare: 'screens.users.presence.away',
  today: 'screens.users.presence.away-since',
  day: 'screens.users.presence.away-day',
};

export function usePersonWords() {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const presenceText = (presence: PresenceView | null): string | null => {
    if (!presence || presence.state === 'unknown') return null;
    const keys = presence.state === 'home' ? HOME : AWAY;
    const since = presence.since;
    if (since === null) return t(keys.bare);
    return presence.sinceKind === 'today'
      ? t(keys.today, { time: date.formatTime(since) })
      : t(keys.day, { date: date.formatDayMonth(since) });
  };
  const titleOf = (line: Pick<PersonLine, 'name' | 'self'>): string =>
    line.self ? t('screens.users.you', { name: line.name }) : line.name;
  const metaOf = (line: PersonLine): string => {
    const role = roleLabelOf(line.role, t);
    const state = line.active ? presenceText(line.presence) : t('screens.users.disabled');
    return state ? `${role} · ${state}` : role;
  };
  return { titleOf, metaOf, presenceText };
}
