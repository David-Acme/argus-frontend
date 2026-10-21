import type { ReactNode } from 'react';
import { View } from 'react-native';

type ListboxProps = { id: string; children: ReactNode };

export function optionId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}

export function Listbox({ id, children }: ListboxProps) {
  return (
    <View nativeID={id} className="p-palette-group">
      {children}
    </View>
  );
}
