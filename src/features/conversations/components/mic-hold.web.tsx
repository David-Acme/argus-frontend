import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import type { HoldDecision } from '@/features/conversations/model/hold-record';

export type MicHoldProps = {
  holding: boolean;
  onStart: () => void;
  onDrag: (decision: HoldDecision, dx: number) => void;
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
