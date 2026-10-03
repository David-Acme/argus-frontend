import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { Setting, SettingApply } from '@/core/types';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Switch } from '@/shared/components/ui/switch';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { SettingChoiceList } from '@/features/settings/components/setting-choice-list';
import { SettingStepper } from '@/features/settings/components/setting-stepper';
import type { VoicePreview } from '@/features/settings/hooks/use-voice-preview';
import { usesChoiceList } from '@/features/settings/model/tts-preview';

type SettingRowProps = {
  setting: Setting;
  siblings: readonly Setting[];
  preview: VoicePreview;
  onChange: (value: string) => void;
};

const COMMIT_DELAY_MS = 600;
const SEGMENTED_MAX_CHOICES = 4;
const SEGMENTED_MAX_CHOICES_COMPACT = 3;

const APPLY_ICON: Record<SettingApply, 'activity' | 'phone' | 'refresh-cw'> = {
  live: 'activity',
  nextSession: 'phone',
  restart: 'refresh-cw',
};

function decimalsOf(step: number): number {
  if (step <= 0 || Number.isInteger(step)) return 0;
  return Math.min(3, String(step).split('.')[1]?.length ?? 0);
}

function humanize(key: string): string {
  const leaf = key.split('.').pop() ?? key;
  const words = leaf.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function SettingRow({ setting, siblings, preview, onChange }: SettingRowProps) {
  const { t, tk } = useTranslation();
  const { isCompact } = useWindowClass();
  const segmentedMax = isCompact ? SEGMENTED_MAX_CHOICES_COMPACT : SEGMENTED_MAX_CHOICES;
  const [draft, setDraft] = useState(setting.value);
  const [synced, setSynced] = useState(setting.value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (synced !== setting.value) {
    setSynced(setting.value);
    setDraft(setting.value);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const labelKey = `screens.settings.keys.${setting.key}.label`;
  const hintKey = `screens.settings.keys.${setting.key}.hint`;
  const label = tk(labelKey) === labelKey ? humanize(setting.key) : tk(labelKey);
  const hint = tk(hintKey) === hintKey ? '' : tk(hintKey);
  const choiceLabel = (choice: string) => {
    const key = `screens.settings.choices.${choice}`;
    return tk(key) === key ? choice : tk(key);
  };

  const commitLater = (value: string) => {
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(value), COMMIT_DELAY_MS);
  };

  const listed = usesChoiceList(setting);

  const control = (() => {
    if (listed)
      return (
        <SettingChoiceList
          setting={setting}
          siblings={siblings}
          label={label}
          choiceLabel={choiceLabel}
          onChange={onChange}
          preview={preview}
        />
      );
    switch (setting.type) {
      case 'toggle':
        return (
          <Switch value={draft === 'true'} accessibilityLabel={label} onChange={(next) => onChange(String(next))} />
        );
      case 'integer':
      case 'decimal': {
        const step = setting.step > 0 ? setting.step : 1;
        return (
          <SettingStepper
            value={Number(draft)}
            min={setting.min}
            max={setting.max}
            step={step}
            decimals={setting.type === 'integer' ? 0 : decimalsOf(step)}
            label={label}
            onChange={(next) => commitLater(String(next))}
          />
        );
      }
      case 'choice':
        if (setting.choices.length <= segmentedMax) {
          return (
            <SegmentedControl
              options={setting.choices.map((choice) => ({ value: choice, label: choiceLabel(choice) }))}
              value={draft}
              onChange={onChange}
              accessibilityLabel={label}
            />
          );
        }
        return (
          <AdaptiveSelect
            options={setting.choices.map((choice) => ({ value: choice, label: choiceLabel(choice) }))}
            value={draft}
            onChange={onChange}
            title={label}
            closeLabel={t('common.close')}
            searchPlaceholder={t('screens.settings.search')}
            emptyLabel={t('screens.users.no-results')}
            trigger={
              <Button variant="outline" size="sm">
                <Text>{choiceLabel(draft)}</Text>
              </Button>
            }
          />
        );
      case 'text':
        return (
          <Input
            value={draft}
            onChangeText={setDraft}
            onBlur={() => draft !== setting.value && onChange(draft)}
            accessibilityLabel={label}
            className="min-w-48"
          />
        );
    }
  })();

  const wideControl = listed || (setting.type === 'choice' && setting.choices.length <= segmentedMax);

  return (
    <View className={cn('gap-3 py-3.5', wideControl ? '' : 'flex-row flex-wrap items-center justify-between')}>
      <View className="min-w-48 flex-1 gap-1">
        <Text variant="label">{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
        <View className="flex-row items-center gap-1.5">
          <Icon name={APPLY_ICON[setting.apply]} className="text-muted-foreground size-3" />
          <Text variant="micro">{t(`screens.settings.apply.${setting.apply}`)}</Text>
        </View>
      </View>
      <View className={wideControl ? 'w-full' : 'shrink-0'}>{control}</View>
    </View>
  );
}
