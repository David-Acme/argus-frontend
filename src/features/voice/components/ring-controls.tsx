import { View } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { IconGlyph } from '@/shared/ui/icon';
import { RoundControl, type RoundTone } from '@/features/voice/components/round-control';
import { useCallScale } from '@/features/voice/hooks/use-call-scale';
import type { RingChoice } from '@/features/voice/model/incoming-surface';

type RingControlsProps = {
  choices: readonly RingChoice[];
  onChoose: (choice: RingChoice) => void;
};

type ChoiceLook = { icon: IconGlyph; tone: RoundTone; label: TranslationKey };

const LOOKS: Readonly<Record<RingChoice, ChoiceLook>> = {
  decline: { icon: 'hang', tone: 'decline', label: 'screens.voice.ring-decline' },
  snooze: { icon: 'clock', tone: 'neutral', label: 'screens.voice.ring-snooze' },
  answer: { icon: 'phone', tone: 'answer', label: 'screens.voice.ring-answer' },
};

export function RingControls({ choices, onChoose }: RingControlsProps) {
  const { t } = useTranslation();
  const { ringControl } = useCallScale();
  return (
    <View className="w-full flex-row justify-around px-2">
      {choices.map((choice) => (
        <RoundControl
          key={choice}
          icon={LOOKS[choice].icon}
          tone={LOOKS[choice].tone}
          label={t(LOOKS[choice].label)}
          size={ringControl}
          caption
          onPress={() => onChoose(choice)}
        />
      ))}
    </View>
  );
}
