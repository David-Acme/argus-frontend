import { useState } from 'react';
import { View } from 'react-native';
import type { SafetyPins } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { PinField } from '@/features/safety/components/pin-field';
import { pinDraftProblem } from '@/features/safety/model/safety';

type PinSetupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (pins: SafetyPins) => Promise<boolean>;
};

export function PinSetupDialog({ open, onOpenChange, onSave }: PinSetupDialogProps) {
  const { t } = useTranslation();
  const [disarmPin, setDisarmPin] = useState('');
  const [duressPin, setDuressPin] = useState('');
  const [saving, setSaving] = useState(false);
  const problem = pinDraftProblem(disarmPin, duressPin);
  const showSame = problem === 'same';
  const disarmHint =
    problem === 'disarm-trivial' ? t('screens.safety.pins.trivial') : t('screens.safety.pins.disarm-hint');
  const duressHint = showSame
    ? t('screens.safety.pins.same')
    : problem === 'duress-trivial'
      ? t('screens.safety.pins.trivial')
      : t('screens.safety.pins.duress-hint');

  const reset = () => {
    setDisarmPin('');
    setDuressPin('');
  };

  const save = async () => {
    if (problem || saving) return;
    setSaving(true);
    const saved = await onSave({ disarmPin, duressPin });
    setSaving(false);
    if (!saved) return;
    reset();
    onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t('screens.safety.pins.title')}
      description={t('screens.safety.pins.description')}
      closeLabel={t('common.cancel')}
      onSubmit={() => void save()}
      footer={
        <View className="flex-row justify-end gap-2">
          <Button variant="ghost" onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button disabled={problem !== null} loading={saving} onPress={() => void save()}>
            <Text>{t('common.save')}</Text>
          </Button>
        </View>
      }>
      <View className="gap-4">
        <PinField
          label={t('screens.safety.pins.disarm')}
          hint={disarmHint}
          value={disarmPin}
          onChange={setDisarmPin}
          autoFocus
        />
        <PinField
          label={t('screens.safety.pins.duress')}
          hint={duressHint}
          value={duressPin}
          onChange={setDuressPin}
          onSubmit={() => void save()}
        />
      </View>
    </AdaptiveDialog>
  );
}
