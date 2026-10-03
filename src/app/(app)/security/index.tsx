import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useAuthStore } from '@/core/stores';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { EmptyState } from '@/shared/components/ui/empty-state';
import {
  DecisionReview,
  ExpectedGuestForm,
  ExpectedGuestList,
  GuardModePicker,
  GuardStatusHero,
  IncidentList,
} from '@/shared/components/security';
import { Button } from '@/shared/components/ui/button';
import { Panel } from '@/shared/components/ui/panel';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useGuard } from '@/shared/hooks/use-guard';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';

export default function SecurityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isExpanded, isMedium } = useWindowClass();
  const bottomInset = useBottomNavInset();
  const role = useAuthStore((state) => state.user?.role);
  const access = guardAccessForRole(role ?? 'guest');
  const guard = useGuard(access.review);
  const [guestFormOpen, setGuestFormOpen] = useState(false);

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
    <Panel title={t('screens.security.mode.title')}>
      <GuardModePicker
        state={guard.mode}
        pending={guard.pendingMode}
        onSelect={guard.setMode}
        readOnly={!access.setMode}
      />
    </Panel>
  );

  const guestSection = (className?: string) => (
    <Panel
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
        onRemove={access.manageGuests ? guard.removeGuest : undefined}
      />
    </Panel>
  );

  const incidentSection = (className?: string) => (
    <Panel
      title={t('screens.security.incidents.title')}
      count={guard.incidents.length}
      className={className}>
      <IncidentList incidents={guard.incidents} />
    </Panel>
  );

  const decisionSection = (className?: string) => (
    <Panel
      title={t('screens.security.decisions.title')}
      description={t('screens.security.decisions.description')}
      count={pendingReviews}
      className={className}>
      <DecisionReview decisions={guard.decisions} onFeedback={guard.sendFeedback} />
    </Panel>
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
    guard.failed ? (
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
    <AppScreen
      scrollable={false}
      bottomNav={false}
      header={
        <ScreenHeader
          title={t('screens.security.title')}
          subtitle={t('screens.security.subtitle')}
          onBack={() => router.back()}
        />
      }>
      {body}
      <ExpectedGuestForm
        open={guestFormOpen}
        onOpenChange={setGuestFormOpen}
        onSubmit={guard.addGuest}
      />
    </AppScreen>
  );
}
