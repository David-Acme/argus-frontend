import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';

type CollapsibleSectionProps = {
  label: string;
  children: ReactNode;
};

/** Keeps the rare fields out of sight until someone looks for them. */
export function CollapsibleSection({ label, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        onPress={() => setOpen((current) => !current)}
        className="flex-row items-center gap-1.5 self-start active:opacity-70">
        <Text className="text-foreground-secondary text-[13px] font-medium">{label}</Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          className="text-muted-foreground size-4"
        />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(140)} className="gap-3.5">
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}
