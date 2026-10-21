import { clsx } from 'clsx';
import { View } from 'react-native';
import { useEffects, useThemeTokens } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { ChoiceOption } from './choice-types';

export type SegmentedProps<T extends string> = {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (next: T) => void;
  glass?: boolean;
};

type SegmentContentProps<T extends string> = { option: ChoiceOption<T>; on: boolean };

export function SegmentContent<T extends string>({ option, on }: SegmentContentProps<T>) {
  return (
    <View className="gap-segment-icon-gap flex-row items-center">
      {option.icon ? <Icon name={option.icon} size="small" tone={on ? 'text' : 'text-2'} /> : null}
      <Text variant="control" tone={on ? 'default' : '2'}>
        {option.label}
      </Text>
    </View>
  );
}

function useTrack(glass: boolean | undefined) {
  const { reduceTransparency } = useEffects();
  const { elevation } = useThemeTokens();
  if (!glass) return { className: 'bg-fill', style: undefined };
  return {
    className: reduceTransparency ? 'bg-surface' : 'bg-glass web:backdrop-blur-control',
    style: { boxShadow: elevation.glassInset },
  };
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  glass,
}: SegmentedProps<T>) {
  const { theme, elevation } = useThemeTokens();
  const track = useTrack(glass);
  const lifted = { boxShadow: elevation.segment };
  const onFill = theme === 'dark' ? 'bg-fill-press' : 'bg-surface';
  return (
    <View
      role="radiogroup"
      aria-label={label}
      className={clsx('rounded-well p-segment-pad gap-segment-gap flex-row', track.className)}
      style={track.style}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <View key={option.value} className="flex-1">
            <PressableSurface
              a11y={{ label: option.label, role: 'radio', checked: on }}
              onPress={() => {
                if (!on) onChange(option.value);
              }}
              haptic={on ? undefined : 'selection'}
              style={on ? lifted : undefined}
              className={clsx(
                'min-h-segment rounded-seg-inner px-segment-min-x items-center justify-center',
                on ? onFill : 'web:hover-dim'
              )}>
              <SegmentContent option={option} on={on} />
            </PressableSurface>
          </View>
        );
      })}
    </View>
  );
}
