import { useContext } from 'react';
import { View } from 'react-native';
import { Choice, type ChoiceOption } from '@/shared/ui/choice';
import { RowPosition } from '@/shared/ui/row';
import { Text } from '@/shared/ui/text';

export type ChoiceRowProps<T extends string> = {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (next: T) => void;
};

export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: ChoiceRowProps<T>) {
  const { index } = useContext(RowPosition);
  return (
    <View className="px-row-x py-row-y gap-2">
      {index > 0 ? (
        <View className="right-row-x left-row-x border-line absolute top-0 border-t" />
      ) : null}
      <Text variant="rowTitle">{label}</Text>
      <Choice label={label} options={options} value={value} onChange={onChange} />
    </View>
  );
}
