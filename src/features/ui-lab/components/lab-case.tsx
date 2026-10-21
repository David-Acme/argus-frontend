import type { ReactNode } from 'react';
import { View } from 'react-native';

type LabCaseProps = { id: string; block?: boolean; children: ReactNode };

export function LabCase({ id, block, children }: LabCaseProps) {
  return (
    <View testID={`case-${id}`} className={block ? 'self-stretch' : 'self-start'}>
      {children}
    </View>
  );
}
