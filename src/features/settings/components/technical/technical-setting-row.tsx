import { View } from 'react-native';
import type { Setting } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { isWideControl, SettingControl } from '@/features/settings/components/setting-control';
import { APPLY_ICON } from '@/features/settings/components/setting-row';
import type { VoicePreview } from '@/features/settings/hooks/use-voice-preview';
import { hasRange, isChanged } from '@/features/settings/model/settings-catalog';
import { rangeText, settingText, unitLabel, valueText } from '@/features/settings/model/setting-text';

type TechnicalSettingRowProps = {
  setting: Setting;
  siblings: readonly Setting[];
  preview: VoicePreview;
  onChange: (value: string) => void;
};

type FactProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function Fact({ label, value, mono = false }: FactProps) {
  return (
    <View className="min-w-0 flex-row items-baseline gap-1">
      <Text variant="micro">{label}</Text>
      <Text variant="micro" selectable numberOfLines={1} className={cn('text-foreground-secondary', mono && 'font-mono')}>
        {value}
      </Text>
    </View>
  );
}

export function TechnicalSettingRow({ setting, siblings, preview, onChange }: TechnicalSettingRowProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const { label, hint } = settingText(setting.key);
  const changed = isChanged(setting);
  const wide = isWideControl(setting, isCompact);
  const unit = unitLabel(setting.unit);
  const applyText = t(`screens.settings.apply.${setting.apply}`);

  return (
    <View className="gap-3 py-4">
      <View className={cn('gap-3', wide ? '' : 'flex-row flex-wrap items-start justify-between')}>
        <View className="min-w-56 flex-1 gap-1.5">
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Text variant="label">{label}</Text>
            {changed ? (
              <StatusBadge label={t('screens.settings.technical.changed')} dotClassName="bg-accent" />
            ) : null}
            {setting.pendingRestart ? (
              <StatusBadge
                label={t('screens.settings.technical.pending')}
                icon="refresh-cw"
                iconClassName="text-warning-strong"
                textClassName="text-warning-strong"
              />
            ) : null}
          </View>
          <Text variant="micro" selectable className="text-foreground-secondary font-mono">
            {setting.key}
          </Text>
          {hint ? <Text variant="caption">{hint}</Text> : null}
          <View className="flex-row flex-wrap gap-x-4 gap-y-1 pt-0.5">
            <Fact label={t('screens.settings.technical.type')} value={t(`screens.settings.technical.types.${setting.type}`)} />
            {unit ? <Fact label={t('screens.settings.technical.unit')} value={unit} /> : null}
            {hasRange(setting) ? <Fact label={t('screens.settings.technical.range')} value={rangeText(setting)} /> : null}
            <Fact label={t('screens.settings.technical.default')} value={valueText(setting, setting.fallback)} />
            <View className="flex-row items-center gap-1">
              <Icon name={APPLY_ICON[setting.apply]} className="text-muted-foreground size-3" />
              <Text variant="micro">{applyText}</Text>
            </View>
          </View>
        </View>
        <View className={cn('gap-2', wide ? 'w-full' : 'shrink-0 items-end')}>
          <SettingControl setting={setting} siblings={siblings} label={label} preview={preview} onChange={onChange} />
          {changed ? (
            <Button
              size="sm"
              variant="ghost"
              accessibilityLabel={t('screens.settings.technical.reset-label', { name: label })}
              onPress={() => onChange(setting.fallback)}
              className={wide ? 'self-start' : undefined}>
              <Icon name="rotate-ccw" className="text-foreground-secondary size-3.5" />
              <Text>{t('screens.settings.technical.reset', { value: valueText(setting, setting.fallback) })}</Text>
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}
