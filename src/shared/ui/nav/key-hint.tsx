import { clsx } from 'clsx';
import { View } from 'react-native';
import { Text } from '@/shared/ui/text';

type KeyHintProps = { label: string; reveal?: boolean };

export function KeyHint({ label, reveal }: KeyHintProps) {
  return (
    <View
      aria-hidden
      className={clsx(
        'rounded-key border-line px-nav-key-x border border-b-2',
        reveal && 'web:opacity-0 web:group-hover:opacity-100'
      )}>
      <Text variant="key" tone="2">
        {label}
      </Text>
    </View>
  );
}
