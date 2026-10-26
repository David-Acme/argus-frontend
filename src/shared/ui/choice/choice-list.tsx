import { clsx } from 'clsx';
import { View } from 'react-native';
import { Icon } from '@/shared/ui/icon';
import { FRAME_BORDER, FieldShell, frameClass } from '@/shared/ui/field';
import { PressableSurface } from '@/shared/ui/pressable';
import { Row, RowPosition } from '@/shared/ui/row';
import { Text } from '@/shared/ui/text';
import type { ChoiceOption } from './choice-types';

export type ChoiceListProps<T extends string> = {
  options: readonly ChoiceOption<T>[];
  value: T;
  onPick: (next: T) => void;
};

export type ChoiceOpenerProps = {
  label: string;
  caption?: string;
  current: string;
  look: 'row' | 'field';
  onOpen: () => void;
};

export function ChoiceList<T extends string>({ options, value, onPick }: ChoiceListProps<T>) {
  return (
    <View role="radiogroup">
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <RowPosition.Provider key={option.value} value={{ index }}>
            <PressableSurface
              a11y={{ label: option.label, role: 'radio', checked: on }}
              onPress={() => onPick(option.value)}
              haptic={on ? undefined : 'selection'}
              pressed={{ fill: true }}>
              <Row
                title={option.label}
                trailing={on ? <Icon name="check" size="small" tone="accent" /> : undefined}
              />
            </PressableSurface>
          </RowPosition.Provider>
        );
      })}
    </View>
  );
}

export function ChoiceOpener({ label, caption, current, look, onOpen }: ChoiceOpenerProps) {
  if (look === 'row')
    return <Row title={label} meta={caption} trailing={current} chevron onPress={onOpen} />;
  const a11y = { label: `${label}, ${current}`, role: 'button' } as const;
  return (
    <FieldShell label={label}>
      <PressableSurface
        a11y={a11y}
        onPress={onOpen}
        className={clsx(frameClass('idle'), 'min-h-field items-center justify-between')}
        style={FRAME_BORDER}>
        <Text variant="entry">{current}</Text>
        <Icon name="chevd" size="small" tone="text" />
      </PressableSurface>
    </FieldShell>
  );
}
