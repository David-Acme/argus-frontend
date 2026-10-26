import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { Setting } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Choice } from '@/shared/ui/choice';
import { Row } from '@/shared/ui/row';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
import {
  COMMIT_DELAY_MS,
  STEPPER_MAX_STEPS,
} from '@/features/settings/constants/services.constant';
import {
  choiceLabel,
  numberText,
  settingText,
  valueText,
} from '@/features/settings/model/setting-text';

type SettingRowProps = {
  setting: Setting;
  onChange: (value: string) => void;
  onOpen: () => void;
};

type StepperProps = { setting: Setting; label: string; onChange: (value: string) => void };

const stepOf = (setting: Setting): number => (setting.step > 0 ? setting.step : 1);

export const steppable = (setting: Setting): boolean =>
  (setting.type === 'integer' || setting.type === 'decimal') &&
  setting.max > setting.min &&
  (setting.max - setting.min) / stepOf(setting) <= STEPPER_MAX_STEPS;

function Stepper({ setting, label, onChange }: StepperProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(Number(setting.value));
  const [synced, setSynced] = useState(setting.value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = stepOf(setting);

  if (synced !== setting.value) {
    setSynced(setting.value);
    setDraft(Number(setting.value));
  }

  const move = (direction: 1 | -1) => {
    const next = Math.min(setting.max, Math.max(setting.min, draft + direction * step));
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(numberText(setting, next)), COMMIT_DELAY_MS);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return (
    <View className="flex-row items-center gap-2">
      <Button
        iconOnly
        compact
        filled
        icon="minus"
        label={t('screens.settings.stepper.less', { name: label })}
        disabled={draft <= setting.min}
        onPress={() => move(-1)}
      />
      <Text variant="label">{valueText(setting, numberText(setting, draft))}</Text>
      <Button
        iconOnly
        compact
        filled
        icon="plus"
        label={t('screens.settings.stepper.more', { name: label })}
        disabled={draft >= setting.max}
        onPress={() => move(1)}
      />
    </View>
  );
}

export function SettingRow({ setting, onChange, onOpen }: SettingRowProps) {
  const { label, hint } = settingText(setting.key);
  if (setting.type === 'toggle')
    return (
      <Row
        title={label}
        meta={hint || undefined}
        trailing={
          <Switch
            label={label}
            value={setting.value === 'true'}
            onValueChange={(next) => onChange(String(next))}
          />
        }
      />
    );
  if (setting.type === 'choice')
    return (
      <Choice
        label={label}
        caption={hint || undefined}
        options={setting.choices.map((choice) => ({ value: choice, label: choiceLabel(choice) }))}
        value={setting.value}
        onChange={onChange}
      />
    );
  if (steppable(setting))
    return (
      <Row
        title={label}
        meta={hint || undefined}
        trailing={<Stepper setting={setting} label={label} onChange={onChange} />}
      />
    );
  return (
    <Row
      title={label}
      meta={hint || undefined}
      trailing={valueText(setting, setting.value)}
      chevron
      onPress={onOpen}
    />
  );
}
