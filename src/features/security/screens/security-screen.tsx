import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { CameraContextPanel } from '@/features/security/components/camera-context-panel';
import { EpisodeList } from '@/features/security/components/episode-list';
import { ExpectedGuestForm } from '@/features/security/components/expected-guest-form';
import { ExpectedGuestList } from '@/features/security/components/expected-guest-list';
import { GuardModePicker } from '@/features/security/components/guard-mode-picker';
import { GuardStatusHero } from '@/features/security/components/guard-status-hero';
import { IncidentList } from '@/features/security/components/incident-list';
import { SitePanel } from '@/features/security/components/site-panel';
import { needsReview } from '@/features/security/model/episode';
import { Button } from '@/shared/components/ui/button';
import { Panel } from '@/shared/components/ui/panel';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useGuard } from '@/features/security/hooks/use-guard';
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
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const [guestFormOpen, setGuestFormOpen] = useState(false);

  const activeGuests = guard.guests.filter(
    (guest) => guest.validUntil * 1000 > guard.loadedAt
  ).length;
  const ongoing = access.review
    ? guard.episodes.filter((episode) => episode.state === 'active').length
    : guard.incidents.length;
  const pendingReviews = guard.episodes.filter(needsReview).length;

  const heroSection = (
    <GuardStatusHero
      state={guard.mode}
      ongoing={ongoing}
      ongoingLabel={access.review ? t('screens.security.status.active') : t('screens.security.status.incidents')}
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

  const episodeSection = (className?: string) => (
    <Panel
      title={t('screens.security.episodes.title')}
      description={t('screens.security.episodes.description')}
      count={pendingReviews}
      className={className}>
      <EpisodeList
        episodes={guard.episodes}
        cameras={cameras}
        contexts={guard.cameras}
        onReview={guard.reviewEpisode}
      />
    </Panel>
  );

  const siteSection = (className?: string) => (
    <SitePanel site={guard.site} onUpdate={guard.updateSite} className={className} />
  );

  const cameraSection = (className?: string) => (
    <CameraContextPanel
      cameras={cameras}
      contexts={guard.cameras}
      onSave={guard.updateCamera}
      className={className}
    />
  );

  const ownerLayout = isExpanded ? (
    <View className="flex-1 flex-row items-stretch gap-5">
      <View className="min-w-0 flex-1 gap-5">
        {heroSection}
        {modeSection}
        {siteSection()}
        {cameraSection('flex-1')}
      </View>
      <View className="min-w-0 flex-1 gap-5">
        {episodeSection('flex-1')}
        {guestSection()}
      </View>
    </View>
  ) : isMedium ? (
    <View className="flex-1 gap-5">
      {heroSection}
      {modeSection}
      {episodeSection()}
      <View className="flex-row items-stretch gap-5">
        {siteSection('min-w-0 flex-1')}
        {cameraSection('min-w-0 flex-1')}
      </View>
      {guestSection('flex-1')}
    </View>
  ) : (
    <View className="flex-1 gap-5">
      {heroSection}
      {modeSection}
      {episodeSection()}
      {siteSection()}
      {cameraSection()}
      {guestSection('flex-1')}
    </View>
  );

  const memberLayout = isExpanded ? (
    <View className="flex-1 flex-row items-stretch gap-5">
      <View className="min-w-0 flex-1 gap-5">
        {heroSection}
        {modeSection}
        {guestSection('flex-1')}
      </View>
      <View className="min-w-0 flex-1 gap-5">{incidentSection('flex-1')}</View>
    </View>
  ) : isMedium ? (
    <View className="flex-1 gap-5">
      {heroSection}
      {modeSection}
      <View className="flex-1 flex-row items-stretch gap-5">
        {guestSection('min-w-0 flex-1')}
        {incidentSection('min-w-0 flex-1')}
      </View>
    </View>
  ) : (
    <View className="flex-1 gap-5">
      {heroSection}
      {modeSection}
      {guestSection()}
      {incidentSection('flex-1')}
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
        {access.review ? ownerLayout : memberLayout}
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
