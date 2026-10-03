import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/stores';
import type { SettingLevel, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { DashboardShell } from '@/shared/components/dashboard';
import { EmptyState } from '@/shared/components/layout';
import { SettingsOwnerList, SettingsOwnerPanel } from '@/shared/components/settings';
import { Button } from '@/shared/components/ui/button';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useSettings } from '@/shared/hooks/use-settings';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';

const visibleAt = (level: SettingLevel) => (owner: SettingsOwner) =>
  owner.settings.filter((setting) => level === 'advanced' || setting.level === 'basic');

export default function SettingsScreen() {
  const { t } = useTranslation();
  const authStatus = useAuthStore((state) => state.status);
  const { role } = usePermissions();
  const { isWide } = useWindowClass();
  const { overview, loading, failed, reload, change } = useSettings();
  const [level, setLevel] = useState<SettingLevel>('basic');
  const [selected, setSelected] = useState<SettingsOwnerName | null>(null);

  const settingsOf = useMemo(() => visibleAt(level), [level]);
  const owner =
    overview.owners.find((candidate) => candidate.service === selected) ?? overview.owners[0] ?? null;
  const levelOptions = useMemo(
    () => [
      { value: 'basic' as const, label: t('screens.settings.level.basic') },
      { value: 'advanced' as const, label: t('screens.settings.level.advanced') },
    ],
    [t]
  );

  if (authStatus !== 'signed-in') return <Redirect href="/" />;
  if (role !== 'owner') return <Redirect href="/profile" />;

  const levelControl = (
    <View className={isWide ? 'w-72' : 'w-full'}>
      <SegmentedControl
        options={levelOptions}
        value={level}
        onChange={setLevel}
        accessibilityLabel={t('screens.settings.level.label')}
      />
    </View>
  );

  return (
    <DashboardShell active="settings">
      <View className="flex-1 gap-5">
        <View className={isWide ? 'flex-row items-end justify-between gap-6' : 'gap-4'}>
          <View className="min-w-0 flex-1 gap-1.5">
            <Text variant="display">{t('screens.settings.title')}</Text>
            <Text className="text-foreground-secondary text-sm leading-5">{t('screens.settings.subtitle')}</Text>
          </View>
          {levelControl}
        </View>

        {owner === null ? (
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
        ) : isWide ? (
          <View className="flex-1 flex-row items-stretch gap-5">
            <View className="w-[280px]">
              <SettingsOwnerList
                owners={overview.owners}
                selected={owner.service}
                layout="column"
                countOf={(candidate) => settingsOf(candidate).length}
                onSelect={setSelected}
              />
            </View>
            <View className="min-w-0 flex-1">
              <SettingsOwnerPanel
                owner={owner}
                settings={settingsOf(owner)}
                onChange={(key, value) => void change({ owner: owner.service, key, value })}
                hiddenCount={owner.settings.length - settingsOf(owner).length}
                onShowAdvanced={() => setLevel('advanced')}
              />
            </View>
          </View>
        ) : (
          <View className="flex-1 gap-4">
            <SettingsOwnerList
              owners={overview.owners}
              selected={owner.service}
              layout="chips"
              countOf={(candidate) => settingsOf(candidate).length}
              onSelect={setSelected}
            />
            <SettingsOwnerPanel
              owner={owner}
              settings={settingsOf(owner)}
              onChange={(key, value) => void change({ owner: owner.service, key, value })}
              hiddenCount={owner.settings.length - settingsOf(owner).length}
              onShowAdvanced={() => setLevel('advanced')}
            />
          </View>
        )}
      </View>
    </DashboardShell>
  );
}
