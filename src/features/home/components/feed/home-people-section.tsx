import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Notice } from '@/shared/ui/notice';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { useHomePeople } from '@/features/home/hooks/use-home-people';
import {
  homeSinceOf,
  peopleWorthShowing,
  type HomePerson,
} from '@/features/home/model/home-people';

const MINUTE_MS = 60_000;

const SKELETON_ROWS = [0, 1, 2] as const;

const STATE_KEYS = {
  home: 'screens.home.people.home',
  away: 'screens.home.people.away',
} as const;

type PersonRowProps = { person: HomePerson; now: number };

function PersonRow({ person, now }: PersonRowProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  if (person.state === 'unknown')
    return (
      <Row
        title={person.self ? t('screens.home.people.you', { name: person.name }) : person.name}
        meta={
          person.self
            ? t('screens.home.people.unknown-self')
            : t('screens.home.people.unknown-other')
        }
        leading={
          <Avatar initial={person.initial} tone={person.self ? 'accent' : 'default'} round />
        }
      />
    );
  const state = t(STATE_KEYS[person.state]);
  const since = homeSinceOf(person, new Date(now));
  const meta =
    since === 'today' && person.since
      ? t('screens.home.people.since-time', { state, time: date.formatTime(person.since) })
      : since === 'day' && person.since
        ? t('screens.home.people.since-day', { state, date: date.formatDayMonth(person.since) })
        : state;
  return (
    <Row
      title={person.self ? t('screens.home.people.you', { name: person.name }) : person.name}
      meta={meta}
      leading={<Avatar initial={person.initial} tone={person.self ? 'accent' : 'default'} round />}
    />
  );
}

export function HomePeopleSection() {
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const { readable, status, retry, people } = useHomePeople();

  if (!readable) return null;
  if (status === 'failed')
    return (
      <Section title={t('screens.home.people.title')} variant="plain">
        <Notice
          tone="attention"
          icon="wifioff"
          title={t('screens.home.people.failed')}
          action={{ label: t('common.retry'), onPress: retry }}
        />
      </Section>
    );
  if (status === 'loading')
    return (
      <View aria-busy aria-label={t('screens.home.people.loading')}>
        <Section title={t('screens.home.people.title')}>
          {SKELETON_ROWS.map((index) => (
            <SkeletonRow key={index} short />
          ))}
        </Section>
      </View>
    );
  if (!peopleWorthShowing(people)) return null;

  return (
    <Section title={t('screens.home.people.title')}>
      {people.map((person) => (
        <PersonRow key={person.id} person={person} now={now} />
      ))}
    </Section>
  );
}
