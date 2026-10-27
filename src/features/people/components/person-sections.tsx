import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { MinorRow, UserPrivacyRow } from '@/features/privacy';
import type { PersonAccount } from '@/features/people/hooks/use-person-account';
import type { PersonCare } from '@/features/people/hooks/use-person-care';
import type { PersonLine, PersonRights } from '@/features/people/model/people';

export type PersonPartProps = { person: PersonLine; rights: PersonRights };

export type CareProps = PersonPartProps & { care: PersonCare };

export type DangerProps = PersonPartProps & { account: PersonAccount; care: PersonCare };

export function PrivacySection({ person, rights }: PersonPartProps) {
  const { t } = useTranslation();
  if (!rights.privacy) return null;
  return (
    <Section title={t('screens.users.privacy')} variant="plain">
      <View className="gap-3">
        <UserPrivacyRow userId={Number(person.id)} />
        {rights.minor ? <MinorRow userId={Number(person.id)} name={person.name} /> : null}
      </View>
    </Section>
  );
}

export function VoiceSection({ care }: Pick<CareProps, 'care'>) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { voice } = care;
  if (!voice) return null;
  return (
    <Section title={t('screens.users.voice.title')}>
      <Row
        leading={<Avatar icon="ear" />}
        title={t('screens.users.voice.recognized')}
        meta={t('screens.users.voice.recognized-since', {
          date: date.formatDayMonth(new Date(voice.since * 1000)),
        })}
        trailing={
          <Button
            compact
            variant="secondary"
            label={t('screens.users.voice.forget')}
            onPress={care.forgetVoice}
          />
        }
      />
    </Section>
  );
}

export function PortraitSection({ person, rights, care }: CareProps) {
  const { t } = useTranslation();
  if (!rights.portrait) return null;
  const { portrait } = care;
  return (
    <Section title={t('screens.users.portrait-verification')}>
      {portrait.uri ? (
        <View className="px-row-x py-row-y items-center">
          <Avatar
            round
            size="portrait"
            portrait={{ uri: portrait.uri }}
            label={t('screens.users.portrait-of', { name: person.name })}
          />
        </View>
      ) : (
        <Row
          leading={<Avatar icon="eye" />}
          title={t('screens.users.verify-portrait')}
          meta={t('screens.users.portrait-private')}
          trailing={
            <Button
              compact
              variant="secondary"
              busy={portrait.loading}
              label={t('screens.users.verify')}
              onPress={portrait.verify}
            />
          }
        />
      )}
    </Section>
  );
}

export function DangerSection({ person, rights, account, care }: DangerProps) {
  const { t } = useTranslation();
  if (!rights.biometrics && !rights.deactivate) return null;
  return (
    <Section>
      {rights.biometrics ? (
        <Row
          danger
          leading={<Avatar icon="face" tone="alert" />}
          title={t('screens.users.biometrics.erase')}
          meta={
            care.erasing
              ? t('screens.users.biometrics.erasing')
              : t('screens.users.biometrics.hint')
          }
          onPress={care.eraseBiometrics}
        />
      ) : null}
      {rights.deactivate && person.active ? (
        <Row
          danger
          leading={<Avatar icon="lock" tone="alert" />}
          title={t('screens.sessions.admin.disable')}
          meta={t('screens.users.disable-meta')}
          onPress={account.deactivate}
        />
      ) : null}
      {rights.deactivate && !person.active ? (
        <Row
          leading={<Avatar icon="key" tone="ok" />}
          title={t('screens.sessions.admin.enable')}
          meta={t('screens.sessions.admin.disabled-hint')}
          onPress={account.activate}
        />
      ) : null}
    </Section>
  );
}
