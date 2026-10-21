import { useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { ChoiceList, ChoiceOpener } from './choice-list';
import { Sheet } from '@/shared/ui/sheet';
import type { ChoiceOption } from './choice-types';
import { SegmentContent, Segmented } from './segmented';
import { MAX_SEGMENTS, segmentsFit } from './segments-fit';

export type ChoiceProps<T extends string> = {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (next: T) => void;
  look?: 'row' | 'field';
  glass?: boolean;
  testID?: string;
};

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

function useFit(count: number) {
  const [width, setWidth] = useState(0);
  const [contentWidths, setContentWidths] = useState<readonly number[]>(() =>
    Array.from({ length: count }, () => 0)
  );
  const measure = (index: number, measured: number) =>
    setContentWidths((widths) =>
      widths[index] === measured ? widths : widths.map((w, i) => (i === index ? measured : w))
    );
  return {
    fits: segmentsFit({ width, contentWidths: contentWidths.slice(0, count) }),
    onLayout: (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
    measure,
  };
}

export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  look = 'row',
  glass,
  testID,
}: ChoiceProps<T>) {
  const [open, setOpen] = useState(false);
  const fit = useFit(options.length);
  const segmentable = options.length <= MAX_SEGMENTS;
  const current = options.find((option) => option.value === value)?.label ?? '';
  const pick = (next: T) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };
  return (
    <View onLayout={fit.onLayout} testID={testID} className="self-stretch">
      {segmentable ? <Measure options={options} onMeasure={fit.measure} /> : null}
      {segmentable && fit.fits ? (
        <Segmented
          label={label}
          options={options}
          value={value}
          onChange={onChange}
          glass={glass}
        />
      ) : (
        <ChoiceOpener label={label} current={current} look={look} onOpen={() => setOpen(true)} />
      )}
      <Sheet variant="list" title={label} open={open} onClose={() => setOpen(false)}>
        <ChoiceList options={options} value={value} onPick={pick} />
      </Sheet>
    </View>
  );
}
