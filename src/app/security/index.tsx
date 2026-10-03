import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useAuthStore } from '@/core/stores';
import type { GuardExpectedGuest, GuardFeedbackLabel, GuardMode } from '@/core/types';
import { EmptyState, ScreenShell } from '@/shared/components/layout';
import { SettingsGroup } from '@/shared/components/profile';
import {
  DecisionReview,
  ExpectedGuestForm,
  ExpectedGuestList,
  GuardModePicker,
  IncidentList,
} from '@/shared/components/security';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useGuard } from '@/shared/hooks/use-guard';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { confirm } from '@/shared/libs/confirm';
import { toast } from '@/shared/libs/toast';

export default function SecurityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isWide } = useWindowClass();
  const bottomInset = useBottomNavInset();
  const authStatus = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);
  const guard = useGuard();
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const { setMode, removeGuest, sendFeedback, addGuest } = guard;

  const changeMode = useCallback(
    async (mode: GuardMode) => {
      if (await setMode(mode)) {
        toast.success(t('screens.security.mode.saved', { mode: t(`screens.security.mode.${mode}`) }));
      }
    },
    [setMode, t]
  );

  const askRemoveGuest = useCallback(
    async (guest: GuardExpectedGuest) => {
      const accepted = await confirm({
        title: t('screens.security.guests.remove-title'),
        description: t('screens.security.guests.remove-description', { name: guest.description }),
        confirmLabel: t('screens.security.guests.remove'),
        intent: 'danger',
      });
      if (accepted && (await removeGuest(guest.id))) toast.success(t('screens.security.guests.removed'));
    },
    [removeGuest, t]
  );

  const giveFeedback = useCallback(
    async (eventId: string, label: GuardFeedbackLabel) => {
      if (await sendFeedback(eventId, label)) toast.success(t('screens.security.decisions.saved'));
    },
    [sendFeedback, t]
  );

  const saveGuest = useCallback(
    async (body: Parameters<typeof addGuest>[0]) => {
      const saved = await addGuest(body);
      if (saved) toast.success(t('screens.security.guests.saved'));
      return saved;
    },
    [addGuest, t]
  );

  if (authStatus !== 'signed-in' || role !== 'owner') return <Redirect href="/" />;

  const modeSection = (
    <View className="gap-2">
      <Text variant="label" className="text-foreground-secondary px-1">
        {t('screens.security.mode.title')}
      </Text>
      <GuardModePicker state={guard.mode} pending={guard.pendingMode} onSelect={changeMode} />
    </View>
  );

  const guestSection = (
    <SettingsGroup title={t('screens.security.guests.title')}>
      <Text variant="caption" className="px-3 pt-2">
        {t('screens.security.guests.description')}
      </Text>
      <ExpectedGuestList guests={guard.guests} now={guard.loadedAt} onRemove={askRemoveGuest} />
      <Button variant="ghost" className="self-start" onPress={() => setGuestFormOpen(true)}>
        <Icon name="user-plus" />
        <Text>{t('screens.security.guests.add')}</Text>
      </Button>
    </SettingsGroup>
  );

  const incidentSection = (
    <SettingsGroup title={t('screens.security.incidents.title')}>
      <IncidentList incidents={guard.incidents} />
    </SettingsGroup>
  );

  const decisionSection = (
    <SettingsGroup title={t('screens.security.decisions.title')}>
      <Text variant="caption" className="px-3 pt-2">
        {t('screens.security.decisions.description')}
      </Text>
      <DecisionReview decisions={guard.decisions} onFeedback={giveFeedback} />
    </SettingsGroup>
  );

  const body = guard.loading && guard.mode == null ? (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator />
    </View>
  ) : guard.failed ? (
    <EmptyState
      icon="triangle-alert"
      title={t('screens.security.load-error')}
      action={
        <Button variant="outline" onPress={guard.reload}>
          <Text>{t('common.retry')}</Text>
        </Button>
      }
    />
  ) : (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
      showsVerticalScrollIndicator={false}>
      {isWide ? (
        <View className="flex-row items-start gap-6">
          <View className="min-w-0 flex-1 gap-6">
            {modeSection}
            {guestSection}
          </View>
          <View className="min-w-0 flex-1 gap-6">
            {incidentSection}
            {decisionSection}
          </View>
        </View>
      ) : (
        <View className="gap-6">
          {modeSection}
          {guestSection}
          {incidentSection}
          {decisionSection}
        </View>
      )}
    </ScrollView>
  );

  return (
    <ScreenShell
      title={t('screens.security.title')}
      subtitle={t('screens.security.subtitle')}
      onBack={() => router.back()}>
      {body}
      <ExpectedGuestForm open={guestFormOpen} onOpenChange={setGuestFormOpen} onSubmit={saveGuest} />
    </ScreenShell>
  );
}
