import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';

export type OnboardingMidProps = { form?: boolean; children: ReactNode };

export function OnboardingMid({ form = false, children }: OnboardingMidProps) {
  return (
    <View
      className={clsx(
        'w-full flex-1 items-center gap-4 py-4',
        form ? 'justify-start pt-8' : 'justify-center'
      )}>
      {children}
    </View>
  );
}
