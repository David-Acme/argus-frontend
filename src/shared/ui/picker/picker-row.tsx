import { clsx } from 'clsx';
import { View } from 'react-native';
import { Text } from '@/shared/ui/text';

export type PickerRowProps = { label: string; value: string; open: boolean; empty: boolean };

export const PICKER_ROW = 'min-h-field gap-row-gap flex-row items-center';

export function PickerRowContent({ label, value, open, empty }: PickerRowProps) {
  return (
    <>
      <View className="min-w-0 flex-1">
        <Text variant="control">{label}</Text>
      </View>
      <View
        className={clsx(
          'rounded-control px-palette-item-x py-1',
          open ? 'bg-accent-soft' : 'bg-fill'
        )}>
        <Text variant="feed" tone={open ? 'accent' : empty ? '3' : 'default'} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </>
  );
}
