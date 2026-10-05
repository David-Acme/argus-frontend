import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { GuardEnvironment, GuardEnvironmentCreate } from '@/core/types';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { EnvironmentFormDialog } from '@/features/security/components/environment-form-dialog';
import { EnvironmentsPanel } from '@/features/security/components/environments-panel';
import { EpisodeList } from '@/features/security/components/episode-list';
import { ExpectedGuestForm } from '@/features/security/components/expected-guest-form';
import { ExpectedGuestList } from '@/features/security/components/expected-guest-list';
import { SecurityHero } from '@/features/security/components/security-hero';
import { useGuard } from '@/features/security/hooks/use-guard';
import { needsReview } from '@/features/security/model/episode';

export default function SecurityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isExpanded, isMedium } = useWindowClass();
  const role = useAuthStore((state) => state.user?.role);
  const access = guardAccessForRole(role ?? 'guest');
  const guard = useGuard(access.review);
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeGuests = guard.guests.filter((guest) => guest.validUntil * 1000 > guard.loadedAt).length;
  const ongoing = guard.episodes.filter((episode) => episode.state === 'active').length;
  const pendingReviews = guard.episodes.filter(needsReview).length;
  const pendingAll = guard.pendingMode?.environmentId === null ? guard.pendingMode.mode : null;

  const open = (environment: GuardEnvironment) => router.push(`/security/${environment.id}`);

  const create = async (body: GuardEnvironmentCreate): Promise<boolean> => {
    const created = await guard.createEnvironment(body);
    if (created) router.push(`/security/${created.id}`);
    return created !== null;
  };

  const heroSection = (
    <SecurityHero
      environments={guard.environments}
      ongoing={ongoing}
      activeGuests={activeGuests}
      pendingReviews={access.review ? pendingReviews : undefined}
      pendingAll={pendingAll}
      onSetAll={access.setMode ? (mode) => void guard.setMode(mode) : undefined}
    />
  );

  const environmentsSection = (className?: string) => (
    <EnvironmentsPanel
      environments={guard.environments}
      cameras={cameras}
      episodes={guard.episodes}
      onOpen={open}
      onCreate={access.review ? () => setCreating(true) : undefined}
      className={className}
    />
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

  const episodeSection = (className?: string) => (
    <Panel
      title={t('screens.security.episodes.title')}
      description={t('screens.security.episodes.description')}
      count={access.review ? pendingReviews : undefined}
      className={className}>
      <EpisodeList
        episodes={guard.episodes}
        cameras={cameras}
        contexts={guard.cameras}
        environments={guard.environments}
        onReview={access.review ? guard.reviewEpisode : undefined}
        onRetain={access.review ? (episode, retain) => void guard.retainEpisode(episode, retain) : undefined}
      />
    </Panel>
  );

  const layout = isExpanded ? (
    <View className="flex-row items-stretch gap-5">
      <View className="min-w-0 flex-1 gap-5">
        {heroSection}
        {environmentsSection('flex-1')}
      </View>
      <View className="min-w-0 flex-1 gap-5">
        {episodeSection()}
        {guestSection('flex-1')}
      </View>
    </View>
  ) : isMedium ? (
    <View className="flex-1 gap-5">
      {heroSection}
      {environmentsSection()}
      <View className="flex-1 flex-row items-stretch gap-5">
        {episodeSection('min-w-0 flex-1')}
        {guestSection('min-w-0 flex-1')}
      </View>
    </View>
  ) : (
    <View className="flex-1 gap-5">
      {heroSection}
      {environmentsSection()}
      {episodeSection()}
      {guestSection('flex-1')}
    </View>
  );

  const body = guard.failed ? (
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
    <ScrollView className="flex-1" contentContainerClassName="grow pb-6" showsVerticalScrollIndicator={false}>
      {layout}
    </ScrollView>
  );

  return (
    <>
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
      </AppScreen>
      <ExpectedGuestForm
        open={guestFormOpen}
        onOpenChange={setGuestFormOpen}
        onSubmit={guard.addGuest}
        environments={guard.environments}
      />
      {creating ? <EnvironmentFormDialog open onOpenChange={setCreating} onSubmit={create} /> : null}
    </>
  );
}
