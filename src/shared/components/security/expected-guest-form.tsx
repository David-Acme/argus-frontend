import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { GuardExpectedGuestCreate } from '@/core/types';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { GUARD_GUEST_DEFAULT_HOURS, GUARD_GUEST_HOURS } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';

type ExpectedGuestFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: GuardExpectedGuestCreate) => Promise<boolean>;
};

const DESCRIPTION_MAX = 200;

export function ExpectedGuestForm({ open, onOpenChange, onSubmit }: ExpectedGuestFormProps) {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState(String(GUARD_GUEST_DEFAULT_HOURS));
  const [oneTime, setOneTime] = useState(false);
  const [saving, setSaving] = useState(false);
  const trimmed = description.trim();

  const hourOptions = useMemo(
    () =>
      GUARD_GUEST_HOURS.map((value) => ({
        value: String(value),
        label: t('screens.security.guests.hours', { hours: String(value) }),
      })),
    [t]
  );

  const change = (next: boolean) => {
    if (!next) {
      setDescription('');
      setHours(String(GUARD_GUEST_DEFAULT_HOURS));
      setOneTime(false);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (trimmed.length === 0) return;
    setSaving(true);
    const saved = await onSubmit({ description: trimmed, hours: Number(hours), oneTime });
    setSaving(false);
    if (saved) change(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={change}
      title={t('screens.security.guests.form-title')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => change(false)} disabled={saving}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={submit} loading={saving} disabled={trimmed.length === 0}>
            <Text>{t('common.save')}</Text>
          </Button>
        </>
      }>
      <View className="gap-4">
        <View className="gap-1.5">
          <Text variant="label">{t('screens.security.guests.who')}</Text>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder={t('screens.security.guests.who-placeholder')}
            maxLength={DESCRIPTION_MAX}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        </View>
        <View className="gap-1.5">
          <Text variant="label">{t('screens.security.guests.duration')}</Text>
          <SegmentedControl
            options={hourOptions}
            value={hours}
            onChange={setHours}
            accessibilityLabel={t('screens.security.guests.duration')}
          />
        </View>
        <View className="gap-1">
          <ToggleRow label={t('screens.security.guests.one-time')} value={oneTime} onChange={setOneTime} />
          <Text variant="caption" className="px-1">
            {t('screens.security.guests.one-time-hint')}
          </Text>
        </View>
      </View>
    </AdaptiveDialog>
  );
}
