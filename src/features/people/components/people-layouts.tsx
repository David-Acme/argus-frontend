import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Confirm } from '@/shared/ui/confirm';
import { Notice } from '@/shared/ui/notice';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { InvitationQrSheet, InviteSheet } from '@/features/people/components/invite-sheets';
import { PeopleList } from '@/features/people/components/people-list';
import { PersonDetail, PersonHead } from '@/features/people/components/person-detail';
import { PersonSheet } from '@/features/people/components/person-sheet';
import type { PeopleScreenState } from '@/features/people/hooks/use-people-screen';

export type PeopleLayoutProps = { state: PeopleScreenState };

type DetailProps = PeopleLayoutProps & { heading: boolean };

function InviteAction({ state }: PeopleLayoutProps) {
  const { t } = useTranslation();
  if (!state.people.invites) return null;
  return (
    <Button
      compact
      variant="primary"
      icon="plus"
      label={t('screens.users.invite')}
      onPress={state.invite.start}
    />
  );
}

function Overlays({ state }: PeopleLayoutProps) {
  const { invitations } = state;
  return (
    <>
      <InviteSheet invite={state.invite} />
      <InvitationQrSheet
        preview={invitations.preview.preview}
        record={invitations.previewRecord}
        now={invitations.now}
        onDismiss={invitations.preview.dismiss}
      />
      <PersonSheet form={state.form} selfId={state.selfId} />
      <Confirm {...state.asking.confirm} />
    </>
  );
}

function Missing({ state }: PeopleLayoutProps) {
  const { t } = useTranslation();
  return (
    <Section variant="plain">
      <Notice
        icon="users"
        title={t('screens.users.person-missing')}
        body={t('screens.users.person-missing-hint')}
        action={{ label: t('common.back'), onPress: state.leave }}
      />
    </Section>
  );
}

function Detail({ state, heading }: DetailProps) {
  const { person, rights } = state;
  if (!person || !rights) return state.missing ? <Missing state={state} /> : null;
  return (
    <View key={person.id}>
      <PersonHead person={person} heading={heading} />
      <PersonDetail person={person} rights={rights} ask={state.asking.ask} onEdit={state.edit} />
    </View>
  );
}

export function PhonePeople({ state }: PeopleLayoutProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-1">
      <Screen
        title={t('screens.users.title')}
        back={{ label: t('common.back'), onPress: state.leave }}
        actions={<InviteAction state={state} />}
        refresh={state.refresh}>
        <PeopleList state={state} selected={null} />
      </Screen>
      <Overlays state={state} />
    </View>
  );
}

export function PhonePerson({ state }: PeopleLayoutProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-1">
      <Screen
        title={state.person?.name ?? t('screens.users.title')}
        back={{ label: t('screens.users.back-people'), onPress: state.leave }}
        refresh={state.refresh}>
        <Detail state={state} heading={false} />
      </Screen>
      <Overlays state={state} />
    </View>
  );
}

export function PanesPeople({ state }: PeopleLayoutProps) {
  const { t } = useTranslation();
  return (
    <>
      <Screen
        columns="panes"
        title={t('screens.users.title')}
        back={{ label: t('common.back'), onPress: state.leave }}
        actions={<InviteAction state={state} />}>
        <ScreenColumns>
          <ScreenColumn width={state.listWidth} label={t('screens.users.list')} grows={false}>
            <PeopleList state={state} selected={state.person?.id ?? null} />
          </ScreenColumn>
          <ScreenColumn label={t('screens.users.detail')} grows={false}>
            <Detail state={state} heading />
          </ScreenColumn>
        </ScreenColumns>
      </Screen>
      <Overlays state={state} />
    </>
  );
}
