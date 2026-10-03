import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useAuthStore } from '@/core/stores';
import type { GuardExpectedGuest, GuardFeedbackLabel, GuardMode } from '@/core/types';
import { EmptyState, ScreenShell } from '@/shared/components/layout';
import {
  DecisionReview,
  ExpectedGuestForm,
  ExpectedGuestList,
  GuardModePicker,
  GuardStatusHero,
  IncidentList,
  SecurityPanel,
} from '@/shared/components/security';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useGuard } from '@/shared/hooks/use-guard';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { confirm } from '@/shared/libs/confirm';
import { toast } from '@/shared/libs/toast';

export default function SecurityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isExpanded, isMedium } = useWindowClass();
  const bottomInset = useBottomNavInset();
  const authStatus = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);
  const access = guardAccessForRole(role ?? 'guest');
  const guard = useGuard(access.review);
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const { setMode, removeGuest, sendFeedback, addGuest } = guard;

  const changeMode = useCallback(
    async (mode: GuardMode) => {
      if (await setMode(mode)) {
        toast.success(
          t('screens.security.mode.saved', { mode: t(`screens.security.mode.${mode}`) })
        );
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
      if (accepted && (await removeGuest(guest.id)))
        toast.success(t('screens.security.guests.removed'));
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

  if (authStatus !== 'signed-in' || !access.view) return <Redirect href="/" />;

  const activeGuests = guard.guests.filter(
    (guest) => guest.validUntil * 1000 > guard.loadedAt
  ).length;
  const pendingReviews = guard.decisions.filter((decision) => decision.feedbackLabel === '').length;

  const heroSection = (
    <GuardStatusHero
      state={guard.mode}
      incidents={guard.incidents.length}
      activeGuests={activeGuests}
      pendingReviews={pendingReviews}
    />
  );

  const modeSection = (
    <SecurityPanel title={t('screens.security.mode.title')}>
      <GuardModePicker
        state={guard.mode}
        pending={guard.pendingMode}
        onSelect={changeMode}
        readOnly={!access.setMode}
      />
    </SecurityPanel>
  );

  const guestSection = (className?: string) => (
    <SecurityPanel
      title={t('screens.security.guests.title')}
      description={t('screens.security.guests.description')}
      count={guard.guests.length}
      className={className}
      action={
        access.manageGuests ? (
          <Button variant="ghost" size="sm" onPress={() => setGuestFormOpen(true)}>
            <Icon name="user-plus" />
            <Text>{t('screens.security.guests.add')}</Text>
          </Button>
        ) : undefined
      }>
      <ExpectedGuestList
        guests={guard.guests}
        now={guard.loadedAt}
        onRemove={access.manageGuests ? askRemoveGuest : undefined}
      />
    </SecurityPanel>
  );

  const incidentSection = (className?: string) => (
    <SecurityPanel
      title={t('screens.security.incidents.title')}
      count={guard.incidents.length}
      className={className}>
      <IncidentList incidents={guard.incidents} />
    </SecurityPanel>
  );

  const decisionSection = (className?: string) => (
    <SecurityPanel
      title={t('screens.security.decisions.title')}
      description={t('screens.security.decisions.description')}
      count={pendingReviews}
      className={className}>
      <DecisionReview decisions={guard.decisions} onFeedback={giveFeedback} />
    </SecurityPanel>
  );

  const layout = isExpanded ? (
    <View className="flex-1 flex-row items-stretch gap-5">
      <View className="min-w-0 flex-1 gap-5">
        {heroSection}
        {modeSection}
        {guestSection('flex-1')}
      </View>
      <View className="min-w-0 flex-1 gap-5">
        {incidentSection('flex-1')}
        {access.review ? decisionSection('flex-1') : null}
      </View>
    </View>
  ) : isMedium ? (
    <View className="flex-1 gap-5">
      {heroSection}
      {modeSection}
      <View className={access.review ? 'flex-row items-stretch gap-5' : 'flex-1 flex-row items-stretch gap-5'}>
        {guestSection('min-w-0 flex-1')}
        {incidentSection('min-w-0 flex-1')}
      </View>
      {access.review ? decisionSection('flex-1') : null}
    </View>
  ) : (
    <View className="flex-1 gap-5">
      {heroSection}
      {modeSection}
      {guestSection()}
      {incidentSection(access.review ? undefined : 'flex-1')}
      {access.review ? decisionSection('flex-1') : null}
    </View>
  );

  const body =
    guard.loading && guard.mode == null ? (
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}>
        {layout}
      </ScrollView>
    );

  return (
    <ScreenShell
      title={t('screens.security.title')}
      subtitle={t('screens.security.subtitle')}
      onBack={() => router.back()}>
      {body}
      <ExpectedGuestForm
        open={guestFormOpen}
        onOpenChange={setGuestFormOpen}
        onSubmit={saveGuest}
      />
    </ScreenShell>
  );
}
