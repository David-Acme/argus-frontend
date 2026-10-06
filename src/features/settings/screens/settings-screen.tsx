import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SettingChange, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { AppScreen } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { ConnectionNotice } from '@/features/settings/components/connection-notice';
import { FirstRunBanner } from '@/features/settings/components/first-run-banner';
import { ProfilePreviewDialog } from '@/features/settings/components/profile/profile-preview-dialog';
import { SettingsProfileSection } from '@/features/settings/components/profile/settings-profile-section';
import { SettingsOwnerList } from '@/features/settings/components/settings-owner-list';
import { SettingsOwnerPanel } from '@/features/settings/components/settings-owner-panel';
import {
  SettingsTransferDialog,
  type TransferMode,
} from '@/features/settings/components/technical/settings-transfer-dialog';
import { TechnicalSettings } from '@/features/settings/components/technical/technical-settings';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { useSettingsMode, type SettingsMode } from '@/features/settings/hooks/use-settings-mode';
import { useSettingsProfiles } from '@/features/settings/hooks/use-settings-profiles';
import { ownerStatus } from '@/features/settings/model/settings-catalog';
import { ModulesSummaryCard } from '@/features/modules';

type Transfer = {
  owner: SettingsOwner;
  mode: TransferMode;
};

const basicSettings = (owner: SettingsOwner) => owner.settings.filter((setting) => setting.level === 'basic');

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { isWide } = useWindowClass();
  const router = useRouter();
  const { has } = useCapabilities();
  const isOwner = has(CAPABILITY.settingsManage);
  const { overview, loading, failed, reload, change, replaceCatalogs } = useSettings({ enabled: isOwner });
  const profiles = useSettingsProfiles({ enabled: isOwner, onCatalogs: replaceCatalogs });
  const { mode, choose } = useSettingsMode();
  const [selected, setSelected] = useState<SettingsOwnerName | null>(null);
  const [focus, setFocus] = useState<SettingsOwnerName | 'all'>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const preview = profiles.profiles?.profiles.find((profile) => profile.id === previewId) ?? null;
  const firstRun = profiles.profiles?.firstRun ?? null;

  const connected = useMemo(
    () => overview.owners.filter((candidate) => ownerStatus(candidate) !== 'unconfigured'),
    [overview.owners]
  );
  const owner =
    connected.find((candidate) => candidate.service === selected) ??
    connected.find((candidate) => candidate.reachable) ??
    connected[0] ??
    null;
  const modeOptions = useMemo(
    () => [
      { value: 'simple' as const, label: t('screens.settings.mode.simple') },
      { value: 'advanced' as const, label: t('screens.settings.mode.advanced') },
    ],
    [t]
  );

  const setValue = (service: SettingsOwnerName, key: string, value: string) =>
    void change({ owner: service, changes: [{ key, value }] });
  const importChanges = (target: SettingsOwner, changes: SettingChange[]) =>
    void change({ owner: target.service, changes });
  const openAdvanced = (service: SettingsOwnerName) => {
    setFocus(service);
    choose('advanced');
  };
  const switchMode = (next: SettingsMode) => {
    if (next === 'advanced') setFocus('all');
    choose(next);
  };

  const panel = (current: SettingsOwner) => (
    <SettingsOwnerPanel
      owner={current}
      settings={basicSettings(current)}
      onChange={(key, value) => setValue(current.service, key, value)}
      hiddenCount={current.settings.length - basicSettings(current).length}
      onShowAdvanced={() => openAdvanced(current.service)}
    />
  );

  const simple =
    owner === null ? null : isWide ? (
      <View className="flex-1 flex-row items-stretch gap-5">
        <View className="w-[280px]">
          <SettingsOwnerList
            owners={connected}
            selected={owner.service}
            layout="column"
            countOf={(candidate) => basicSettings(candidate).length}
            onSelect={setSelected}
          />
        </View>
        <View className="min-w-0 flex-1">{panel(owner)}</View>
      </View>
    ) : (
      <View className="flex-1 gap-4">
        <SettingsOwnerList
          owners={connected}
          selected={owner.service}
          layout="chips"
          countOf={(candidate) => basicSettings(candidate).length}
          onSelect={setSelected}
        />
        {panel(owner)}
      </View>
    );

  return (
    <>
      <AppScreen>
        <View className="flex-1 gap-5">
          <View className={isWide ? 'flex-row items-end justify-between gap-6' : 'gap-4'}>
            <View className="min-w-0 flex-1 gap-1.5">
              <Text variant="display">{t('screens.settings.title')}</Text>
              <Text variant="caption" className="text-foreground-secondary">
                {mode === 'simple' ? t('screens.settings.subtitle') : t('screens.settings.subtitle-advanced')}
              </Text>
            </View>
            <View className={isWide ? 'w-72' : 'w-full'}>
              <SegmentedControl
                options={modeOptions}
                value={mode}
                onChange={switchMode}
                accessibilityLabel={t('screens.settings.mode.label')}
              />
            </View>
          </View>

          {isOwner ? <ModulesSummaryCard /> : null}
          {isOwner && has(CAPABILITY.activityRead) ? (
            <Panel className="p-1.5">
              <ListRow
                icon="history"
                title={t('screens.activity.entry')}
                subtitle={t('screens.activity.entry-hint')}
                chevron
                onPress={() => router.push('/settings/activity')}
              />
            </Panel>
          ) : null}

          {firstRun?.state === 'applied' ? (
            <FirstRunBanner firstRun={firstRun} reverting={profiles.reverting} onRevert={() => void profiles.revert()} />
          ) : null}

          {overview.owners.length === 0 ? (
            <EmptyState
              icon="sliders"
              title={failed ? t('screens.settings.load-error') : t('screens.settings.title')}
              hint={loading ? undefined : t('screens.settings.owner-unreachable-hint')}
              action={
                failed ? (
                  <Button size="sm" onPress={() => void reload()}>
                    <Text>{t('common.retry')}</Text>
                  </Button>
                ) : undefined
              }
            />
          ) : mode === 'simple' ? (
            <>
              <ConnectionNotice
                owners={overview.owners}
                onRetry={() => void reload()}
                onDetails={() => switchMode('advanced')}
              />
              <SettingsProfileSection
                profiles={profiles.profiles}
                loading={profiles.loading}
                failed={profiles.failed}
                applying={profiles.applying}
                onOpen={(profile) => setPreviewId(profile.id)}
                onRetry={() => void profiles.reload()}
              />
              {simple}
            </>
          ) : (
            <TechnicalSettings
              key={focus}
              overview={overview}
              initialService={focus}
              onChange={setValue}
              onTransfer={(target, transferMode) => setTransfer({ owner: target, mode: transferMode })}
            />
          )}
        </View>
      </AppScreen>
      <ProfilePreviewDialog
        profile={preview}
        recommendation={profiles.profiles?.recommendation ?? null}
        onApply={(profile) => {
          setPreviewId(null);
          void profiles.apply(profile);
        }}
        onClose={() => setPreviewId(null)}
      />
      <SettingsTransferDialog
        key={transfer ? `${transfer.mode}:${transfer.owner.service}` : 'closed'}
        owner={transfer?.owner ?? null}
        mode={transfer?.mode ?? 'export'}
        onApply={importChanges}
        onClose={() => setTransfer(null)}
      />
    </>
  );
}
