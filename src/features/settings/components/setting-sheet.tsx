import { useState } from 'react';
import { View } from 'react-native';
import type { Setting } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Choice } from '@/shared/ui/choice';
import { Field } from '@/shared/ui/field';
import { Row } from '@/shared/ui/row';
import { Sheet } from '@/shared/ui/sheet';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
import { APPLY_LABEL } from '@/features/settings/constants/services.constant';
import { hasRange, isChanged, sameSettingValue } from '@/features/settings/model/settings-catalog';
import {
  choiceLabel,
  rangeText,
  settingText,
  valueText,
} from '@/features/settings/model/setting-text';

type SettingSheetProps = {
  setting: Setting | null;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
};

type EditorProps = { setting: Setting; onChange: (value: string) => void };

const typed = (setting: Setting): boolean => setting.type !== 'toggle' && setting.type !== 'choice';

function Instant({ setting, onChange }: EditorProps) {
  const { label } = settingText(setting.key);
  if (setting.type === 'toggle')
    return (
      <Row
        title={label}
        trailing={
          <Switch
            label={label}
            value={setting.value === 'true'}
            onValueChange={(next) => onChange(String(next))}
          />
        }
      />
    );
  return (
    <Choice
      label={label}
      look="field"
      options={setting.choices.map((choice) => ({ value: choice, label: choiceLabel(choice) }))}
      value={setting.value}
      onChange={onChange}
    />
  );
}

type BodyProps = EditorProps & {
  draft: string;
  onDraft: (value: string) => void;
  onSave: () => void;
};

type OpenProps = {
  setting: Setting;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
};

function Body({ setting, onChange, draft, onDraft, onSave }: BodyProps) {
  const { t } = useTranslation();
  const { label, hint } = settingText(setting.key);
  const facts = [
    setting.key,
    hasRange(setting) ? rangeText(setting) : null,
    t(APPLY_LABEL[setting.apply]),
  ].filter(Boolean);
  return (
    <View className="gap-4">
      {hint ? (
        <Text variant="body" tone="2">
          {hint}
        </Text>
      ) : null}
      {typed(setting) ? (
        <Field
          label={label}
          value={draft}
          onChangeText={onDraft}
          content={setting.type === 'text' ? 'plain' : 'number'}
          submit={{ key: 'done', onSubmit: onSave }}
        />
      ) : (
        <Instant setting={setting} onChange={onChange} />
      )}
      <Text variant="meta" tone="3">
        {facts.join(' · ')}
      </Text>
      {isChanged(setting) ? (
        <Button
          variant="ghost"
          icon="refresh"
          label={t('screens.settings.advanced.reset', {
            value: valueText(setting, setting.fallback),
          })}
          onPress={() => onChange(setting.fallback)}
        />
      ) : (
        <Text variant="meta" tone="3">
          {t('screens.settings.advanced.factory', { value: valueText(setting, setting.fallback) })}
        </Text>
      )}
    </View>
  );
}

function OpenSheet({ setting, onChange, onClose }: OpenProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(setting.value);
  const change = (value: string) => {
    if (!sameSettingValue(setting, setting.value, value)) onChange(setting.key, value);
  };
  const save = () => {
    change(draft.trim());
    onClose();
  };
  return (
    <Sheet
      open
      variant="form"
      title={settingText(setting.key).label}
      onClose={onClose}
      dirty={typed(setting) && draft !== setting.value}
      actions={
        typed(setting) ? { primary: { label: t('common.save'), onPress: save } } : undefined
      }>
      <Body setting={setting} onChange={change} draft={draft} onDraft={setDraft} onSave={save} />
    </Sheet>
  );
}

export function SettingSheet({ setting, onChange, onClose }: SettingSheetProps) {
  if (!setting) return null;
  return <OpenSheet key={setting.key} setting={setting} onChange={onChange} onClose={onClose} />;
}
