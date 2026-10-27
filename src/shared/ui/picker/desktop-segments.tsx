import { useState } from 'react';
import type { TranslationKey } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  dateOrderOf,
  dayOfParts,
  partsOfDay,
  partsOfTime,
  sampleDay,
  segmentSpec,
  timeOfParts,
  type DatePart,
  type DateParts,
  type SegmentPart,
  type TimePart,
  type TimeParts,
} from './model/segments';
import type { Segment } from './segment-input';

export type SegmentDraft = {
  segments: Segment[];
  change: (part: SegmentPart, value: number | null, final: boolean) => void;
  problem: TranslationKey | null;
};

const LABEL: Record<SegmentPart, TranslationKey> = {
  day: 'common.picker.day',
  month: 'common.picker.month',
  year: 'common.picker.year',
  hour: 'common.picker.hour',
  minute: 'common.picker.minute',
  period: 'common.picker.period',
};

const PLACEHOLDER: Record<DatePart, TranslationKey> = {
  day: 'common.picker.placeholder-day',
  month: 'common.picker.placeholder-month',
  year: 'common.picker.placeholder-year',
};

const EMPTY_TIME = '--';

const pad = (value: number, digits: number): string => String(value).padStart(digits, '0');

const filled = (values: readonly (number | null)[]): boolean =>
  values.every((value) => value !== null);

export function useDateSegments(
  value: number | null,
  onCommit: (at: number) => boolean
): SegmentDraft {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const [draft, setDraft] = useState<DateParts | null>(null);
  const shown = draft ?? partsOfDay(value);
  const order = dateOrderOf(date.formatShortDate(sampleDay()));
  const segments = order.map((part) => {
    const spec = segmentSpec(part, false);
    const current = shown[part];
    return {
      part,
      label: t(LABEL[part]),
      value: current,
      spec,
      shown: current === null ? '' : pad(current, spec.digits),
      placeholder: t(PLACEHOLDER[part]),
    };
  });
  const change = (part: SegmentPart, next: number | null, final: boolean) => {
    const parts: DateParts = { ...shown, [part]: next };
    const at = final ? dayOfParts(parts) : null;
    if (at !== null && onCommit(at)) setDraft(null);
    else setDraft(parts);
  };
  const complete = draft !== null && filled([draft.day, draft.month, draft.year]);
  const real = draft !== null && dayOfParts(draft) !== null;
  const problem = complete
    ? real
      ? 'common.picker.early-date'
      : 'common.picker.invalid-date'
    : null;
  return { segments, change, problem };
}

export function useTimeSegments(
  value: number | null,
  onCommit: (minutes: number) => void
): SegmentDraft {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { hour12 } = date;
  const [draft, setDraft] = useState<TimeParts | null>(null);
  const shown = draft ?? partsOfTime(value, hour12);
  const parts: TimePart[] = hour12 ? ['hour', 'minute', 'period'] : ['hour', 'minute'];
  const words = (part: TimePart, current: number) =>
    part === 'period' ? date.formatPeriod(current === 1) : pad(current, 2);
  const segments = parts.map((part) => {
    const current = shown[part];
    return {
      part,
      label: t(LABEL[part]),
      value: current,
      spec: segmentSpec(part, hour12),
      shown: current === null ? '' : words(part, current),
      placeholder: part === 'period' ? date.formatPeriod(false) : EMPTY_TIME,
    };
  });
  const change = (part: SegmentPart, next: number | null, final: boolean) => {
    const updated: TimeParts = { ...shown, [part]: next };
    const minutes = final ? timeOfParts(updated, hour12) : null;
    if (minutes === null) {
      setDraft(updated);
      return;
    }
    setDraft(null);
    onCommit(minutes);
  };
  const needed = hour12 ? [shown.hour, shown.minute, shown.period] : [shown.hour, shown.minute];
  const problem = draft !== null && filled(needed) ? 'common.picker.invalid-time' : null;
  return { segments, change, problem };
}
