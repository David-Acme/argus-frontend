import type { SharedValue } from 'react-native-reanimated';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import type { HoldVerdict } from '@/features/conversations/model/hold-record';

export type MicHoldProps = {
  holding: boolean;
  onStart: () => void;
  drag: SharedValue<number>;
  onDecide: (verdict: HoldVerdict) => void;
  onRelease: () => void;
  onActivate: () => void;
};

export function MicHold({ onActivate }: MicHoldProps) {
  const { t } = useTranslation();
  return (
    <Button
      iconOnly
      ink
      icon="mic"
      label={t('screens.conversations.note.record')}
      onPress={onActivate}
    />
  );
}
