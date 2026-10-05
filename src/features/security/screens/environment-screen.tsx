import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { GuardEnvironment, GuardEnvironmentCreate, MenuOption } from '@/core/types';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { CameraContextPanel } from '@/features/security/components/camera-context-panel';
import { EmergencyContactDialog } from '@/features/security/components/emergency-contact-dialog';
import { EmergencyContactsPanel } from '@/features/security/components/emergency-contacts-panel';
import { EnvironmentFormDialog } from '@/features/security/components/environment-form-dialog';
import { EnvironmentSettingsPanel } from '@/features/security/components/environment-settings-panel';
import { EpisodeList } from '@/features/security/components/episode-list';
import { GuardModePicker } from '@/features/security/components/guard-mode-picker';
import { ResponseRecipientsPanel } from '@/features/security/components/response-recipients-panel';
import { ENVIRONMENT_KIND_ICONS, EPISODE_LIST_MAX_HEIGHT } from '@/features/security/constants';
import { useEnvironmentResponse } from '@/features/security/hooks/use-environment-response';
import { useGuard, useGuardEnvironments } from '@/features/security/hooks/use-guard';
import { camerasIn, postureKey } from '@/features/security/model/environments';

type EnvironmentAction = 'edit' | 'remove';

type EnvironmentBodyProps = {
  environment: GuardEnvironment;
};

function EnvironmentBody({ environment }: EnvironmentBodyProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { isExpanded, isMedium } = useWindowClass();
  const role = useAuthStore((state) => state.user?.role);
  const selfId = useAuthStore((state) => state.user?.id ?? 0);
  const access = guardAccessForRole(role ?? 'guest');
  const guard = useGuard(access.review, environment.id);
  const allCameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const [editing, setEditing] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const owner = role === 'owner';
  const response = useEnvironmentResponse(environment.id, owner);
  const current = guard.environments.find((item) => item.id === environment.id) ?? environment;
  const cameras = camerasIn(current, guard.environments, allCameras);
  const pending = guard.pendingMode?.environmentId === current.id ? guard.pendingMode.mode : null;

  const actions: MenuOption<EnvironmentAction>[] = [
    { value: 'edit', label: t('screens.security.environments.edit'), icon: 'pencil' },
    ...(current.isDefault
      ? []
      : [
          {
            value: 'remove' as const,
            label: t('screens.security.environments.remove'),
            icon: 'trash' as const,
            destructive: true,
          },
        ]),
  ];

  const onAction = async (action: EnvironmentAction) => {
    if (action === 'edit') {
      setEditing(true);
      return;
    }
    if (await guard.removeEnvironment(current)) router.replace('/security');
  };

  const rename = (body: GuardEnvironmentCreate) => guard.updateEnvironment(current, body);

  const modeSection = (
    <Panel
      title={t('screens.security.environments.mode-title')}
      description={t(`screens.security.occupancy.${postureKey(current)}`)}>
      <GuardModePicker
        selected={current.mode}
        pending={pending}
        onSelect={(mode) => void guard.setMode(mode, current)}
        readOnly={!access.setMode}
        accessibilityLabel={t('screens.security.environments.mode-title')}
      />
    </Panel>
  );

  const settingsSection = (className?: string) => (
    <EnvironmentSettingsPanel
      environment={current}
      onUpdate={access.review ? (patch) => guard.updateEnvironment(current, patch) : undefined}
      className={className}
    />
  );

  const cameraSection = (className?: string) =>
    access.review ? (
      <CameraContextPanel
        cameras={cameras}
        contexts={guard.cameras}
        environments={guard.environments}
        environment={current}
        onSave={guard.updateCamera}
        className={className}
      />
    ) : null;

  const recipientsSection = (className?: string) => (
    <ResponseRecipientsPanel
      config={response.config}
      failed={response.status === 'failed'}
      editable={owner}
      selfId={selfId}
      onMode={(userId, mode) => void response.setMode(userId, mode)}
      onMove={(userId, direction) => void response.move(userId, direction)}
      onDuty={(userId, onDuty) => void response.setDuty(userId, onDuty)}
      onStepSeconds={(seconds) => void response.setStepSeconds(seconds)}
      className={className}
    />
  );

  const contactsSection = (className?: string) => (
    <EmergencyContactsPanel
      config={response.config}
      editable={owner}
      onContacts={response.setContacts}
      onEmergency={response.setEmergency}
      onAdd={() => setAddingContact(true)}
      className={className}
    />
  );

  const episodeSection = (fill: boolean) => (
    <Panel
      title={t('screens.security.environments.episodes-title')}
      className={fill ? 'min-h-[420px] flex-1 basis-0' : undefined}>
      <EpisodeList
        episodes={guard.episodes}
        cameras={allCameras}
        contexts={guard.cameras}
        paging={guard.episodePaging}
        maxHeight={fill ? undefined : EPISODE_LIST_MAX_HEIGHT}
        onReview={access.review ? guard.reviewEpisode : undefined}
        onRetain={access.review ? (episode, retain) => void guard.retainEpisode(episode, retain) : undefined}
      />
    </Panel>
  );

  const layout = isExpanded ? (
    <View className="flex-1 flex-row items-stretch gap-5">
      <View className="min-w-0 flex-1 gap-5">
        {modeSection}
        {recipientsSection()}
        {settingsSection('flex-1')}
      </View>
      <View className="min-w-0 flex-1 gap-5">
        {contactsSection()}
        {cameraSection()}
        {episodeSection(true)}
      </View>
    </View>
  ) : isMedium ? (
    <View className="flex-1 gap-5">
      {modeSection}
      <View className="flex-row items-stretch gap-5">
        {recipientsSection('min-w-0 flex-1')}
        {contactsSection('min-w-0 flex-1')}
      </View>
      <View className="flex-row items-stretch gap-5">
        {settingsSection('min-w-0 flex-1')}
        {cameraSection('min-w-0 flex-1')}
      </View>
      {episodeSection(true)}
    </View>
  ) : (
    <View className="flex-1 gap-5">
      {modeSection}
      {recipientsSection()}
      {contactsSection()}
      {cameraSection()}
      {episodeSection(false)}
      {settingsSection('flex-1')}
    </View>
  );

  return (
    <>
      <AppScreen
        scrollable={false}
        bottomNav={false}
        header={
          <ScreenHeader
            title={current.name}
            subtitle={
              current.isDefault
                ? `${t(`screens.security.environments.kinds.${current.kind}`)} · ${t('screens.security.environments.default')}`
                : t(`screens.security.environments.kinds.${current.kind}`)
            }
            onBack={() => router.back()}
            action={
              access.review ? (
                <AdaptiveMenu
                  options={actions}
                  onSelect={(action) => void onAction(action)}
                  title={t('screens.security.environments.actions')}
                  closeLabel={t('common.close')}
                  trigger={
                    <IconButton icon="more-horizontal" label={t('screens.security.environments.actions')} />
                  }
                />
              ) : (
                <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
                  <Icon name={ENVIRONMENT_KIND_ICONS[current.kind]} className="text-foreground-secondary size-5" />
                </View>
              )
            }
          />
        }>
        <ScrollView className="flex-1" contentContainerClassName="grow pb-6" showsVerticalScrollIndicator={false}>
          {layout}
        </ScrollView>
      </AppScreen>
      {editing ? (
        <EnvironmentFormDialog open onOpenChange={setEditing} environment={current} onSubmit={rename} />
      ) : null}
      {owner ? (
        <EmergencyContactDialog
          open={addingContact}
          onOpenChange={setAddingContact}
          onSave={(contact) => void response.setContacts([...(response.config?.contacts ?? []), contact])}
        />
      ) : null}
    </>
  );
}

export default function EnvironmentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const environments = useGuardEnvironments(true).data;
  const environment = environments?.find((item) => String(item.id) === id) ?? null;

  if (environment) return <EnvironmentBody environment={environment} />;

  return (
    <AppScreen
      bottomNav={false}
      header={<ScreenHeader title={t('screens.security.title')} onBack={() => router.back()} />}>
      {environments ? (
        <EmptyState
          icon="map-pin"
          title={t('screens.security.environments.not-found')}
          hint={t('screens.security.environments.not-found-hint')}
          action={
            <Button variant="outline" onPress={() => router.replace('/security')}>
              <Text>{t('screens.security.environments.back')}</Text>
            </Button>
          }
        />
      ) : (
        <View className="bg-card h-40 rounded-3xl" />
      )}
    </AppScreen>
  );
}
