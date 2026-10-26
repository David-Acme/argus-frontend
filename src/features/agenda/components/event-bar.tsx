import { clsx } from 'clsx';
import { View } from 'react-native';
import type { BarLook } from '@/features/agenda/model/agenda-lines';

export type EventBarProps = { look: BarLook };

const SOLID: Record<Exclude<BarLook, 'series' | 'free'>, string> = {
  reminder: 'bg-ev1-bar',
  event: 'bg-ev3-bar',
  task: 'bg-ev2-bar',
  shared: 'bg-ev4-bar',
  overdue: 'bg-alert',
};

const SEGMENTS = Array.from({ length: 16 }, (_, index) => index);

export function EventBar({ look }: EventBarProps) {
  if (look === 'series' || look === 'free') {
    return (
      <View aria-hidden className="w-event-bar relative self-stretch overflow-hidden">
        <View className="absolute inset-x-0 top-0 gap-1">
          {SEGMENTS.map((index) => (
            <View
              key={index}
              className={clsx(
                'w-event-bar rounded-full',
                look === 'series' ? 'bg-ev3-bar h-2' : 'bg-fill-press h-1'
              )}
            />
          ))}
        </View>
      </View>
    );
  }
  return (
    <View aria-hidden className={clsx('w-event-bar self-stretch rounded-full', SOLID[look])} />
  );
}
