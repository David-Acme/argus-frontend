import { useEffect, useRef, useState } from 'react';
import type { Setting } from '@/core/types';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Switch } from '@/shared/components/ui/switch';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { SettingChoiceList } from '@/features/settings/components/setting-choice-list';
import { SettingStepper } from '@/features/settings/components/setting-stepper';
import type { VoicePreview } from '@/features/settings/hooks/use-voice-preview';
import { choiceLabel } from '@/features/settings/model/setting-text';
import { usesChoiceList } from '@/features/settings/model/tts-preview';

type SettingControlProps = {
  setting: Setting;
  siblings: readonly Setting[];
  label: string;
  preview: VoicePreview;
  onChange: (value: string) => void;
};

const COMMIT_DELAY_MS = 600;
const SEGMENTED_MAX_CHOICES = 4;
const SEGMENTED_MAX_CHOICES_COMPACT = 3;
const STEPPER_MAX_STEPS = 400;

function decimalsOf(step: number): number {
  if (step <= 0 || Number.isInteger(step)) return 0;
  return Math.min(3, String(step).split('.')[1]?.length ?? 0);
}

export function isWideControl(setting: Setting, compact: boolean): boolean {
  const segmentedMax = compact ? SEGMENTED_MAX_CHOICES_COMPACT : SEGMENTED_MAX_CHOICES;
  return usesChoiceList(setting) || (setting.type === 'choice' && setting.choices.length <= segmentedMax);
}

function stepsAcross(setting: Setting, step: number): number {
  return setting.max > setting.min ? (setting.max - setting.min) / step : 0;
}

export function SettingControl({ setting, siblings, label, preview, onChange }: SettingControlProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const segmentedMax = isCompact ? SEGMENTED_MAX_CHOICES_COMPACT : SEGMENTED_MAX_CHOICES;
  const [draft, setDraft] = useState(setting.value);
  const [synced, setSynced] = useState(setting.value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (synced !== setting.value) {
    setSynced(setting.value);
    setDraft(setting.value);
  }

  const commitLater = (value: string) => {
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(value), COMMIT_DELAY_MS);
  };

  const commitTyped = () => {
    const parsed = Number(draft);
    if (draft.trim() === '' || Number.isNaN(parsed) || draft === setting.value) {
      setDraft(setting.value);
      return;
    }
    onChange(draft.trim());
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  if (usesChoiceList(setting))
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
      return <Switch value={draft === 'true'} accessibilityLabel={label} onChange={(next) => onChange(String(next))} />;
    case 'integer':
    case 'decimal': {
      const step = setting.step > 0 ? setting.step : 1;
      if (stepsAcross(setting, step) > STEPPER_MAX_STEPS)
        return (
          <Input
            value={draft}
            onChangeText={setDraft}
            onBlur={commitTyped}
            onSubmitEditing={commitTyped}
            keyboardType="numeric"
            accessibilityLabel={label}
            className="w-36 text-right tabular-nums"
          />
        );
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
      if (setting.choices.length <= segmentedMax)
        return (
          <SegmentedControl
            options={setting.choices.map((choice) => ({ value: choice, label: choiceLabel(choice) }))}
            value={draft}
            onChange={onChange}
            accessibilityLabel={label}
          />
        );
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
}
