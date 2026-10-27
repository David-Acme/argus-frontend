import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleLabelOf } from '@/shared/libs/role-label';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Text } from '@/shared/ui/text';
import { PersonSessions } from '@/features/people/components/person-sessions';
import {
  DangerSection,
  PortraitSection,
  PrivacySection,
  VoiceSection,
} from '@/features/people/components/person-sections';
import type { Ask } from '@/features/people/hooks/use-ask';
import { useAccessLine } from '@/features/people/hooks/use-access-line';
import { usePersonAccount } from '@/features/people/hooks/use-person-account';
import { usePersonCare } from '@/features/people/hooks/use-person-care';
import { usePersonWords } from '@/features/people/hooks/use-person-words';
import type { PersonLine, PersonRights } from '@/features/people/model/people';

export type PersonDetailProps = {
  person: PersonLine;
  rights: PersonRights;
  ask: Ask['ask'];
  onEdit: (id: string) => void;
};

type HeadProps = { person: PersonLine; heading: boolean };

export function PersonHead({ person, heading }: HeadProps) {
  const { titleOf, metaOf } = usePersonWords();
  return (
    <View className="gap-row-gap py-row-y flex-row items-center">
      <Avatar
        round
        size="large"
        initial={person.initial}
        tone={person.self ? 'accent' : 'default'}
      />
      <View className="min-w-0 flex-1">
        {heading ? (
          <Text variant="title" heading={1}>
            {titleOf(person)}
          </Text>
        ) : null}
        <Text variant="meta" tone="2">
          {metaOf(person)}
        </Text>
      </View>
    </View>
  );
}

function AccessSection({ person, rights, onEdit }: Omit<PersonDetailProps, 'ask'>) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const line = useAccessLine(person.role);
  return (
    <Section title={t('screens.users.access')}>
      <Row
        leading={<Avatar icon="key" />}
        title={roleLabelOf(person.role, t)}
        meta={line}
        chevron={rights.edit}
        onPress={rights.edit ? () => onEdit(person.id) : undefined}
      />
      <Row
        leading={<Avatar icon="cal" />}
        title={t('screens.users.member-since', {
          date: date.formatDayMonth(new Date(person.createdAt)),
        })}
        meta={
          person.active
            ? t('screens.sessions.admin.account-active')
            : t('screens.sessions.admin.account-disabled')
        }
      />
    </Section>
  );
}

export function PersonDetail({ person, rights, ask, onEdit }: PersonDetailProps) {
  const account = usePersonAccount({ person, enabled: rights.sessions, ask });
  const care = usePersonCare({ person, rights, ask });
  return (
    <>
      <AccessSection person={person} rights={rights} onEdit={onEdit} />
      {rights.sessions ? <PersonSessions account={account} active={person.active} /> : null}
      <PortraitSection person={person} rights={rights} care={care} />
      <VoiceSection care={care} />
      <PrivacySection person={person} rights={rights} />
      <DangerSection person={person} rights={rights} account={account} care={care} />
    </>
  );
}
