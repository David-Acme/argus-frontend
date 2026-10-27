import { Fragment, useRef } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/ui/text';
import {
  segmentAction,
  stepValue,
  typeDigit,
  type SegmentPart,
  type SegmentSpec,
} from './model/segments';

export type Segment = {
  part: SegmentPart;
  label: string;
  value: number | null;
  spec: SegmentSpec;
  shown: string;
  placeholder: string;
};

export type SegmentInputProps = {
  segments: readonly Segment[];
  separator: (index: number) => string;
  onChange: (part: SegmentPart, value: number | null, final: boolean) => void;
};

type SegmentKeyEvent = {
  key: string;
  currentTarget: HTMLElement;
  preventDefault: () => void;
};

function sibling(event: SegmentKeyEvent, step: number): void {
  const row = event.currentTarget.parentElement;
  const all = row ? [...row.querySelectorAll<HTMLElement>('[role="spinbutton"]')] : [];
  all[all.indexOf(event.currentTarget) + step]?.focus();
}

export function SegmentInput({ segments, separator, onChange }: SegmentInputProps) {
  const typed = useRef<Partial<Record<SegmentPart, string>>>({});
  const keysOf = (segment: Segment) => ({
    onKeyDown: (event: SegmentKeyEvent) => {
      const { part, spec, value } = segment;
      const action = segmentAction(event.key, part);
      if (action === null) return;
      event.preventDefault();
      if (action === 'left' || action === 'right') {
        sibling(event, action === 'right' ? 1 : -1);
        return;
      }
      if (action === 'digit') {
        const next = typeDigit(typed.current[part] ?? '', event.key, spec);
        typed.current[part] = next.done ? '' : next.text;
        onChange(part, Number(next.text), next.done);
        if (next.done) sibling(event, 1);
        return;
      }
      typed.current[part] = '';
      if (action === 'clear') onChange(part, null, true);
      else if (action === 'period') onChange(part, event.key.toLowerCase() === 'p' ? 1 : 0, true);
      else onChange(part, stepValue(value, action === 'up' ? 1 : -1, spec), true);
    },
    onBlur: () => {
      if (!typed.current[segment.part]) return;
      typed.current[segment.part] = '';
      onChange(segment.part, segment.value, true);
    },
  });
  return (
    <View className="flex-row items-center">
      {segments.map((segment, index) => (
        <Fragment key={segment.part}>
          {index > 0 ? (
            <Text variant="feed" tone="3">
              {separator(index)}
            </Text>
          ) : null}
          <View
            focusable
            role="spinbutton"
            aria-label={segment.label}
            aria-valuenow={segment.value ?? undefined}
            aria-valuetext={segment.value === null ? undefined : segment.shown}
            aria-valuemin={segment.spec.min}
            aria-valuemax={segment.spec.max}
            className="web:focus:bg-accent-soft web:outline-none rounded-sm px-1"
            {...keysOf(segment)}>
            <Text variant="feed" tone={segment.value === null ? '3' : 'default'}>
              {segment.value === null ? segment.placeholder : segment.shown}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
