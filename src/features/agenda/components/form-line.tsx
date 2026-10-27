import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

export type FormLineProps = {
  label: string;
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
};

const FRAME = 'min-h-field flex-row items-center gap-3';

function Body({ label, value, trailing }: Omit<FormLineProps, 'onPress'>) {
  return (
    <>
      <View className="min-w-0 flex-1">
        <Text variant="control">{label}</Text>
      </View>
      {value ? (
        <Text variant="feed" tone="2">
          {value}
        </Text>
      ) : null}
      {trailing}
    </>
  );
}

export function FormLine({ label, value, trailing, onPress }: FormLineProps) {
  if (!onPress)
    return (
      <View className={FRAME}>
        <Body label={label} value={value} trailing={trailing} />
      </View>
    );
  return (
    <PressableSurface
      a11y={{ label: [label, value].filter(Boolean).join(', '), role: 'button' }}
      onPress={onPress}
      pressed={{ scale: 'surface' }}
      className={FRAME}>
      <Body
        label={label}
        value={value}
        trailing={<Icon name="chev" size="small" tone="text-3" />}
      />
    </PressableSurface>
  );
}
