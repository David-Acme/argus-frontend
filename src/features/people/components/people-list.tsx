import { useRouter } from 'expo-router';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { HouseholdPrivacyPanel } from '@/features/privacy';
import { InvitationsSection } from '@/features/people/components/invitations-section';
import { PersonRow } from '@/features/people/components/person-row';
import { PEOPLE_HREF } from '@/features/people/constants/people.constant';
import type { PeopleScreenState } from '@/features/people/hooks/use-people-screen';

export type PeopleListProps = { state: PeopleScreenState; selected: string | null };

function Members({ state, selected }: PeopleListProps) {
  const { t } = useTranslation();
  const { lines } = state.people;
  if (lines.length === 0)
    return (
      <Section variant="plain">
        <Notice
          icon="users"
          title={t('screens.users.no-people')}
          body={t('screens.users.no-people-hint')}
        />
      </Section>
    );
  return (
    <Section title={t('screens.users.members')} meta={String(lines.length)}>
      {lines.map((person) => (
        <PersonRow
          key={person.id}
          person={person}
          selected={person.id === selected}
          onOpen={state.open}
        />
      ))}
    </Section>
  );
}

function Visitors() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Section>
      <Row
        leading={<Avatar icon="face" />}
        title={t('screens.visitors.section')}
        meta={t('screens.users.visitors-meta')}
        chevron
        onPress={() => router.push(PEOPLE_HREF.visitors)}
      />
    </Section>
  );
}

export function PeopleList({ state, selected }: PeopleListProps) {
  const { t } = useTranslation();
  const { people } = state;
  return (
    <>
      <Members state={state} selected={selected} />
      {people.invites ? (
        <InvitationsSection invitations={state.invitations} onInvite={state.invite.start} />
      ) : null}
      {people.visitors ? <Visitors /> : null}
      {people.invites ? (
        <Section title={t('screens.privacy.household.title')} variant="plain">
          <HouseholdPrivacyPanel />
        </Section>
      ) : null}
    </>
  );
}
