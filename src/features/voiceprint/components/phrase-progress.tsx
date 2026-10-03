import { View } from 'react-native';
import { cn } from '@/shared/libs/utils';
import type { PhraseState } from '../model/enrollment';

type PhraseProgressProps = {
  phrases: readonly PhraseState[];
  current: number;
};

function dotClass(state: PhraseState, isCurrent: boolean): string {
  if (state === 'accepted') return 'bg-success';
  if (state === 'rejected') return 'bg-error';
  return isCurrent ? 'bg-accent' : 'bg-border';
}

export function PhraseProgress({ phrases, current }: PhraseProgressProps) {
  return (
    <View className="flex-row items-center justify-center gap-2" accessibilityElementsHidden>
      {phrases.map((state, index) => (
        <View
          key={index}
          className={cn('h-2 rounded-full', index === current ? 'w-6' : 'w-2', dotClass(state, index === current))}
        />
      ))}
    </View>
  );
}
