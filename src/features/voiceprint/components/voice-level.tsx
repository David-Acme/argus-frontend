import { View } from 'react-native';
import { cn } from '@/shared/libs/utils';

type VoiceLevelProps = {
  level: number;
  active: boolean;
};

const BAR_WEIGHTS = [0.45, 0.7, 0.9, 1, 0.85, 0.65, 0.5] as const;
const MIN_HEIGHT = 6;
const MAX_HEIGHT = 36;

export function VoiceLevel({ level, active }: VoiceLevelProps) {
  const clamped = Math.max(0, Math.min(1, level));

  return (
    <View
      className="h-10 flex-row items-center justify-center gap-1.5"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {BAR_WEIGHTS.map((weight, index) => (
        <View
          key={index}
          className={cn('w-1.5 rounded-full', active ? 'bg-accent' : 'bg-border')}
          style={{ height: MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * clamped * weight }}
        />
      ))}
    </View>
  );
}
