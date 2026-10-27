import { View } from 'react-native';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { useHomePeople } from '@/features/home';
import {
  doneResults,
  shownResults,
  useArgusResults,
  useResultLine,
  useResultWhen,
} from '@/features/voice';
import type { ArgusResult } from '@/features/voice';

type DoneProps = { results: readonly ArgusResult[]; now: number };

const MINUTE_MS = 60_000;

const DONE_SHOWN = 6;

const PEOPLE_STATE_KEYS = {
  home: 'screens.home.people.home',
  away: 'screens.home.people.away',
  unknown: 'screens.home.people.unknown-other',
} as const;

function Done({ results, now }: DoneProps) {
  const { t } = useTranslation();
  const lineOf = useResultLine(now);
  const when = useResultWhen(now);
  const done = doneResults(results).slice(0, DONE_SHOWN);
  if (done.length === 0)
    return (
      <Section title={t('screens.conversations.context.done')}>
        <Notice
          centred
          icon="cmd"
          title={t('screens.conversations.context.done-empty')}
          body={t('screens.conversations.context.done-empty-hint')}
        />
      </Section>
    );
  return (
    <Section title={t('screens.conversations.context.done')}>
      {done.map((result) => {
        const line = lineOf(result);
        return (
          <Row
            key={result.id}
            title={line.title}
            meta={when.timeOf(result.at)}
            leading={<Avatar icon={line.icon} />}
          />
        );
      })}
    </Section>
  );
}

function Home() {
  const { t } = useTranslation();
  const { readable, people } = useHomePeople();
  if (!readable || people.length === 0) return null;
  return (
    <Section title={t('screens.conversations.context.home')}>
      {people.map((person) => (
        <Row
          key={person.id}
          title={person.self ? t('screens.home.people.you', { name: person.name }) : person.name}
          meta={t(PEOPLE_STATE_KEYS[person.state])}
          leading={
            <Avatar initial={person.initial} tone={person.self ? 'accent' : 'default'} round />
          }
        />
      ))}
    </Section>
  );
}

export function ContextPanel() {
  const results = shownResults(useArgusResults());
  const now = useNow(MINUTE_MS);
  return (
    <View className="gap-6">
      <Done results={results} now={now} />
      <Home />
    </View>
  );
}
