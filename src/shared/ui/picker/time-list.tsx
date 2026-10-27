import { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { size } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { nearestSlot, timeSlots } from './model/clock';

export type TimeListProps = {
  label: string;
  value: number | null;
  fallback: number;
  step: number;
  onPick: (minutes: number) => void;
};

const ROW = size.wheelRow;

const SHOWN = 6;

const LEAD = 2;

const HOUR = 60;

export function TimeList({ label, value, fallback, step, onPick }: TimeListProps) {
  const date = useDateFormatter();
  const scroll = useRef<ScrollView>(null);
  const slots = timeSlots(step);
  const current = nearestSlot(value ?? fallback, step);
  const frame = { maxHeight: ROW * SHOWN };
  const words = (minutes: number) =>
    date.formatTime(new Date(2000, 0, 1, Math.floor(minutes / HOUR), minutes % HOUR));
  return (
    <ScrollView
      ref={scroll}
      style={frame}
      onLayout={() =>
        scroll.current?.scrollTo({ y: Math.max(0, (current - LEAD) * ROW), animated: false })
      }>
      <View role="radiogroup" aria-label={label}>
        {slots.map((minutes, index) => (
          <PressableSurface
            key={minutes}
            a11y={{
              label: words(minutes),
              role: 'radio',
              checked: index === current && value !== null,
            }}
            onPress={() => onPick(minutes)}
            pressed={{ fill: true }}
            className="h-wheel-row px-palette-item-x rounded-control justify-center">
            <Text
              variant={index === current && value !== null ? 'label' : 'feed'}
              tone={index === current && value !== null ? 'accent' : 'default'}>
              {words(minutes)}
            </Text>
          </PressableSurface>
        ))}
      </View>
    </ScrollView>
  );
}
