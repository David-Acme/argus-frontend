import { clsx } from 'clsx';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Meter } from '@/shared/ui/meter';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import type { HomePerson } from '@/features/home';
import { joinNames } from '@/features/profile/model/household';
import type { HouseholdMeta, HouseholdTitle } from '@/features/profile/model/household';
import type { HomeStepKey } from '@/features/profile/model/home-steps';
import type { Household } from '@/features/profile/hooks/use-household';

type HomePanelProps = { household: Household; peopleHref: '/users' | '/people' | null };

type PileProps = { people: readonly HomePerson[] };

type StepsProps = { household: Household };

const STEP = {
  invite: {
    icon: 'users',
    title: 'screens.profile.steps.invite.title',
    body: 'screens.profile.steps.invite.body',
    action: 'screens.profile.steps.invite.action',
    href: { pathname: '/users', params: { invite: '1' } },
  },
  camera: {
    icon: 'cam',
    title: 'screens.profile.steps.camera.title',
    body: 'screens.profile.steps.camera.body',
    action: 'screens.profile.steps.camera.action',
    href: { pathname: '/security', params: {} },
  },
} as const satisfies Record<HomeStepKey, unknown>;

const PILE_SHOWN = 4;

function Pile({ people }: PileProps) {
  return (
    <View className="flex-row" aria-hidden>
      {people.slice(0, PILE_SHOWN).map((person, index) => (
        <View
          key={person.id}
          className={clsx(index > 0 && '-ml-3', person.state === 'away' && 'opacity-50')}>
          <Avatar
            round
            size="small"
            initial={person.initial}
            tone={person.self ? 'accent' : 'default'}
          />
        </View>
      ))}
    </View>
  );
}

function useTitle(title: HouseholdTitle): string {
  const { t } = useTranslation();
  const and = t('common.and');
  switch (title.kind) {
    case 'alone':
      return t('screens.profile.household.alone');
    case 'you':
      return title.others.length === 0
        ? t('screens.profile.household.you')
        : t('screens.profile.household.you-with', { names: joinNames(title.others, and) });
    case 'others':
      return title.others.length === 1
        ? t('screens.profile.household.other-one', { names: joinNames(title.others, and) })
        : t('screens.profile.household.other-many', { names: joinNames(title.others, and) });
    case 'nobody':
      return t('screens.profile.household.nobody');
  }
}

function useMeta(meta: HouseholdMeta): string {
  const { t } = useTranslation();
  const { formatTime } = useDateFormatter();
  switch (meta.kind) {
    case 'left':
      return t('screens.profile.household.left', { name: meta.name, time: formatTime(meta.since) });
    case 'away':
      return meta.names.length === 1
        ? t('screens.profile.household.away-one', { names: joinNames(meta.names, t('common.and')) })
        : t('screens.profile.household.away-many', {
            names: joinNames(meta.names, t('common.and')),
          });
    case 'everyone':
      return t('screens.profile.household.everyone');
  }
}

function PresenceCard({ household, peopleHref }: HomePanelProps) {
  const router = useRouter();
  const summary = household.summary;
  const title = useTitle(summary?.title ?? { kind: 'nobody' });
  const meta = useMeta(summary?.meta ?? { kind: 'everyone' });
  if (!summary || (summary.title.kind === 'alone' && household.invites)) return null;
  return (
    <Section>
      <Row
        leading={<Pile people={household.people} />}
        title={title}
        meta={meta}
        chevron={peopleHref !== null}
        onPress={peopleHref ? () => router.push(peopleHref) : undefined}
      />
    </Section>
  );
}

function AloneCard({ household }: StepsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  if (!household.invites || household.names.length > 1) return null;
  return (
    <Section>
      <Row
        leading={
          <Avatar round size="small" initial={household.names[0]?.charAt(0) ?? ''} tone="accent" />
        }
        title={t('screens.profile.household.alone')}
        meta={t('screens.profile.household.alone-meta')}
        trailing={
          <Button
            compact
            variant="primary"
            label={t('screens.profile.invite')}
            onPress={() => router.push(STEP.invite.href)}
          />
        }
      />
    </Section>
  );
}

function Steps({ household }: StepsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { steps } = household;
  if (steps.pending.length === 0) return null;
  const heading = t(steps.started ? 'screens.profile.steps.title' : 'screens.profile.steps.start');
  const count = t('screens.profile.steps.count', {
    done: String(steps.done),
    total: String(steps.total),
  });
  return (
    <Section title={heading} meta={count} variant="plain">
      <View className="px-1 pb-3">
        <Meter fraction={steps.done / steps.total} label={`${heading}, ${count}`} />
      </View>
      <View className="gap-3">
        {steps.pending.map((key, index) => (
          <View key={key}>
            <Notice
              icon={STEP[key].icon}
              title={t(STEP[key].title)}
              body={t(STEP[key].body)}
              action={{
                label: t(STEP[key].action),
                primary: index === 0,
                onPress: () => router.push(STEP[key].href),
              }}
            />
          </View>
        ))}
      </View>
    </Section>
  );
}

export function HomePanel({ household, peopleHref }: HomePanelProps) {
  return (
    <>
      <PresenceCard household={household} peopleHref={peopleHref} />
      <AloneCard household={household} />
      <Steps household={household} />
    </>
  );
}
