import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

export type FillScrollProps = { children: ReactNode };

const FILL = { flexGrow: 1 };

export function FillScroll({ children }: FillScrollProps) {
  return (
    <ScrollView
      contentContainerStyle={FILL}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}
