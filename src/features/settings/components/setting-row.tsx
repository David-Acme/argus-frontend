import { View } from 'react-native';
import type { Setting, SettingApply } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { isWideControl, SettingControl } from '@/features/settings/components/setting-control';
import type { VoicePreview } from '@/features/settings/hooks/use-voice-preview';
import { settingText } from '@/features/settings/model/setting-text';

type SettingRowProps = {
  setting: Setting;
  siblings: readonly Setting[];
  preview: VoicePreview;
  onChange: (value: string) => void;
};

export const APPLY_ICON: Record<SettingApply, 'activity' | 'phone' | 'refresh-cw'> = {
  live: 'activity',
  nextSession: 'phone',
  restart: 'refresh-cw',
};

export function SettingRow({ setting, siblings, preview, onChange }: SettingRowProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const { label, hint } = settingText(setting.key);
  const wide = isWideControl(setting, isCompact);

  return (
    <View className={cn('gap-3 py-3.5', wide ? '' : 'flex-row flex-wrap items-center justify-between')}>
      <View className="min-w-48 flex-1 gap-1">
        <Text variant="label">{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
        <View className="flex-row items-center gap-1.5">
          <Icon name={APPLY_ICON[setting.apply]} className="text-muted-foreground size-3" />
          <Text variant="micro">
            {setting.pendingRestart ? t('screens.settings.technical.pending') : t(`screens.settings.apply.${setting.apply}`)}
          </Text>
        </View>
      </View>
      <View className={wide ? 'w-full' : 'shrink-0'}>
        <SettingControl setting={setting} siblings={siblings} label={label} preview={preview} onChange={onChange} />
      </View>
    </View>
  );
}
