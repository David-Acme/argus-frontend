import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type AutocompleteInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
  /** Offered while typing; filtered by what is already written. */
  suggestions: readonly string[];
  onPick: (value: string) => void;
  variant?: 'default' | 'error';
};

const VISIBLE = 4;

/** Input that proposes known values instead of asking the user to remember them. */
export function AutocompleteInput({
  suggestions,
  onPick,
  value,
  onFocus,
  onBlur,
  ...props
}: AutocompleteInputProps) {
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const needle = String(value ?? '').trim().toLowerCase();
    return suggestions
      .filter((option) => option.toLowerCase() !== needle)
      .filter((option) => needle.length === 0 || option.toLowerCase().includes(needle))
      .slice(0, VISIBLE);
  }, [suggestions, value]);

  return (
    <View>
      <Input
        value={value}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {focused && matches.length > 0 ? (
        <View className="border-border-subtle bg-card mt-1.5 overflow-hidden rounded-xl border">
          {matches.map((option, index) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={option}
              onPress={() => onPick(option)}
              className={cn(
                'active:bg-surface-secondary px-3 py-2.5',
                index > 0 && 'border-border-subtle border-t'
              )}>
              <Text className="text-[14px]">{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
