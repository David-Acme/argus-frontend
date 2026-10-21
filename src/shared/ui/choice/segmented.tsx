import { clsx } from 'clsx';
import { View } from 'react-native';
import { IS_WEB } from '@/shared/constants';
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

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

type ArrowEvent = { key: string; currentTarget: HTMLElement; preventDefault: () => void };

function useArrowKeys<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const onKeyDown = (event: ArrowEvent) => {
    const step = STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const at = options.findIndex((option) => option.value === value);
    const next = (at + step + options.length) % options.length;
    const target = options[next];
    if (!target) return;
    onChange(target.value);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };
  return IS_WEB ? { onKeyDown } : null;
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

export function Segmented<T extends string>(props: SegmentedProps<T>) {
  const { label, options, value, onChange, glass } = props;
  const { theme, elevation } = useThemeTokens();
  const keys = useArrowKeys(props);
  const track = useTrack(glass);
  const lifted = { boxShadow: elevation.segment };
  const onFill = theme === 'dark' ? 'bg-fill-press' : 'bg-surface';
  return (
    <View
      role="radiogroup"
      aria-label={label}
      className={clsx('rounded-well p-segment-pad gap-segment-gap flex-row', track.className)}
      style={track.style}
      {...keys}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <View key={option.value} className="flex-1">
            <PressableSurface
              a11y={{ label: option.label, role: 'radio', checked: on, tabStop: on }}
              onPress={() => {
                if (!on) onChange(option.value);
              }}
              haptic={on ? undefined : 'selection'}
              className={clsx(
                'min-h-target-min rounded-seg-inner -my-0.5 justify-center',
                !on && 'web:hover-dim'
              )}>
              <View
                style={on ? lifted : undefined}
                className={clsx(
                  'min-h-segment rounded-seg-inner px-segment-min-x items-center justify-center',
                  on && onFill
                )}>
                <SegmentContent option={option} on={on} />
              </View>
            </PressableSurface>
          </View>
        );
      })}
    </View>
  );
}
