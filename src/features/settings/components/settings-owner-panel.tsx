import { View } from 'react-native';
import type { Setting, SettingsOwner } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { SETTINGS_OWNER_ICONS } from '@/features/settings/components/settings-owner-list';
import { SettingRow } from '@/features/settings/components/setting-row';
import { useVoicePreview } from '@/features/settings/hooks/use-voice-preview';
import { Panel } from '@/shared/components/ui/panel';

type SettingsOwnerPanelProps = {
  owner: SettingsOwner;
  settings: readonly Setting[];
  onChange: (key: string, value: string) => void;
  hiddenCount: number;
  onShowAdvanced: () => void;
};

type PanelNoticeProps = {
  icon: 'wifi-off' | 'sliders';
  title: string;
  hint: string;
};

function PanelNotice({ icon, title, hint }: PanelNoticeProps) {
  return (
    <View className="min-h-64 flex-1 items-center justify-center gap-2 px-6 py-10">
      <View className="bg-surface-secondary size-11 items-center justify-center rounded-full">
        <Icon name={icon} className="text-muted-foreground size-5" />
      </View>
      <Text variant="label" className="text-center">
        {title}
      </Text>
      <Text variant="caption" className="max-w-sm text-center">
        {hint}
      </Text>
    </View>
  );
}

export function SettingsOwnerPanel({
  owner,
  settings,
  onChange,
  hiddenCount,
  onShowAdvanced,
}: SettingsOwnerPanelProps) {
  const { t, tk } = useTranslation();
  const preview = useVoicePreview();
  const groups = [...new Set(settings.map((setting) => setting.group))];
  const groupLabel = (group: string) => {
    const key = `screens.settings.groups.${group}`;
    return tk(key) === key ? group : tk(key);
  };

  return (
    <Panel className="flex-1 p-5">
      <View className="flex-row items-center gap-3 pb-2">
        <View className="bg-surface-secondary size-11 items-center justify-center rounded-full">
          <Icon name={SETTINGS_OWNER_ICONS[owner.service]} className="text-foreground-secondary size-5" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="headline">{t(`screens.settings.owners.${owner.service}.name`)}</Text>
          <Text variant="caption">{t(`screens.settings.owners.${owner.service}.hint`)}</Text>
        </View>
      </View>
      {!owner.reachable ? (
        <PanelNotice
          icon="wifi-off"
          title={t('screens.settings.owner-unreachable')}
          hint={t('screens.settings.owner-unreachable-hint')}
        />
      ) : settings.length === 0 ? (
        <PanelNotice
          icon="sliders"
          title={t('screens.settings.owner-empty')}
          hint={t('screens.settings.owner-empty-hint')}
        />
      ) : (
        groups.map((group) => (
          <View key={group} className="pt-3">
            <Text variant="micro" className="pb-1">
              {groupLabel(group)}
            </Text>
            <View className="divide-border-subtle divide-y">
              {settings
                .filter((setting) => setting.group === group)
                .map((setting) => (
                  <SettingRow
                    key={setting.key}
                    setting={setting}
                    siblings={owner.settings}
                    preview={preview}
                    onChange={(value) => onChange(setting.key, value)}
                  />
                ))}
            </View>
          </View>
        ))
      )}
      {owner.reachable && hiddenCount > 0 ? (
        <View className="bg-surface-secondary mt-4 flex-row flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
          <View className="min-w-48 flex-1 flex-row items-center gap-3">
            <Icon name="sliders" className="text-foreground-secondary size-4" />
            <Text variant="caption" className="flex-1">
              {t('screens.settings.more-advanced', { count: String(hiddenCount) })}
            </Text>
          </View>
          <Button size="sm" variant="outline" onPress={onShowAdvanced}>
            <Text>{t('screens.settings.show-advanced')}</Text>
          </Button>
        </View>
      ) : null}
    </Panel>
  );
}
