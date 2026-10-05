import { useState } from 'react';
import { View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { PinField } from '@/features/safety/components/pin-field';
import { PIN_PATTERN } from '@/features/safety/model/safety';
import { useDisarmPinStore } from '@/features/safety/stores/disarm-pin.store';

export function DisarmPinDialog() {
  const { t } = useTranslation();
  const open = useDisarmPinStore((state) => state.open);
  const answer = useDisarmPinStore((state) => state.answer);
  const [pin, setPin] = useState('');
  const valid = PIN_PATTERN.test(pin);

  const close = (value: string | null) => {
    setPin('');
    answer(value);
  };

  const submit = () => {
    if (valid) close(pin);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close(null);
      }}
      title={t('screens.safety.disarm.title')}
      description={t('screens.safety.disarm.description')}
      closeLabel={t('common.cancel')}
      onSubmit={submit}
      footer={
        <View className="flex-row justify-end gap-2">
          <Button variant="ghost" onPress={() => close(null)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button disabled={!valid} onPress={submit}>
            <Text>{t('screens.safety.disarm.confirm')}</Text>
          </Button>
        </View>
      }>
      <PinField label={t('screens.safety.disarm.pin')} value={pin} onChange={setPin} autoFocus onSubmit={submit} />
    </AdaptiveDialog>
  );
}
