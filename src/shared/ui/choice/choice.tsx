import { useState, type ReactNode } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '@/shared/ui/text';
import { ChoiceList, ChoiceOpener } from './choice-list';
import { Sheet, useOpenedOnce } from '@/shared/ui/sheet';
import type { ChoiceOption } from './choice-types';
import { SegmentContent, Segmented } from './segmented';
import { MAX_SEGMENTS } from './segments-fit';
import { useFit } from './use-fit';

export type ChoiceProps<T extends string> = {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (next: T) => void;
  look?: 'row' | 'field';
  caption?: string;
  glass?: boolean;
  testID?: string;
};

type LabelledProps = { label: string; caption?: string; children: ReactNode };

type MeasureProps<T extends string> = {
  options: readonly ChoiceOption<T>[];
  onMeasure: (index: number, width: number) => void;
};

function Measure<T extends string>({ options, onMeasure }: MeasureProps<T>) {
  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      className="pointer-events-none absolute inset-x-0 top-0 opacity-0">
      <ScrollView horizontal scrollEnabled={false}>
        {options.map((option, index) => (
          <View
            key={option.value}
            onLayout={(event: LayoutChangeEvent) =>
              onMeasure(index, event.nativeEvent.layout.width)
            }>
            <SegmentContent option={option} on />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Labelled({ label, caption, children }: LabelledProps) {
  if (caption === undefined) return <>{children}</>;
  return (
    <View className="px-row-x py-row-y gap-row-meta-gap">
      <Text variant="rowTitle">{label}</Text>
      <Text variant="rowMeta">{caption}</Text>
      <View className="mt-2">{children}</View>
    </View>
  );
}

export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  look = 'row',
  caption,
  glass,
  testID,
}: ChoiceProps<T>) {
  const [open, setOpen] = useState(false);
  const mounted = useOpenedOnce(open);
  const fit = useFit(options.length);
  const segmentable = options.length <= MAX_SEGMENTS;
  const current = options.find((option) => option.value === value)?.label ?? '';
  const pick = (next: T) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };
  return (
    <View testID={testID} className="self-stretch">
      <View className={caption === undefined ? undefined : 'px-row-x'}>
        <View onLayout={fit.onLayout}>
          {segmentable ? <Measure options={options} onMeasure={fit.measure} /> : null}
        </View>
      </View>
      {segmentable && fit.fits ? (
        <Labelled label={label} caption={caption}>
          <Segmented
            label={label}
            options={options}
            value={value}
            onChange={onChange}
            glass={glass}
          />
        </Labelled>
      ) : (
        <ChoiceOpener
          label={label}
          caption={caption}
          current={current}
          look={look}
          onOpen={() => setOpen(true)}
        />
      )}
      {mounted ? (
        <Sheet variant="list" title={label} open={open} onClose={() => setOpen(false)}>
          <ChoiceList options={options} value={value} onPick={pick} />
        </Sheet>
      ) : null}
    </View>
  );
}
