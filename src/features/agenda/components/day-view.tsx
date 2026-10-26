import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { AgendaItem, DayRange } from '@/core/types';
import { space } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { barOf, lineWords } from '@/features/agenda/model/agenda-lines';
import { dayHours } from '@/features/agenda/model/day-hours';
import type { HourBlock } from '@/features/agenda/model/day-hours';
import { AgendaLine } from '@/features/agenda/components/agenda-line';
import { EventBar } from '@/features/agenda/components/event-bar';
import type { ListContext } from '@/features/agenda/model/agenda-view';

export type DayViewProps = {
  items: readonly AgendaItem[];
  range: DayRange;
  context: ListContext;
  empty: ReactNode;
};

type BlockProps = { block: HourBlock; context: ListContext };

const HOUR_HEIGHT = space[12] + space[4];

const HOUR_ROW = { height: HOUR_HEIGHT };

const MINUTE_HEIGHT = HOUR_HEIGHT / 60;

const percent = (value: number): `${number}%` => `${value * 100}%`;

function blockPlace({ top, span, lane, lanes }: HourBlock) {
  return {
    top: top * MINUTE_HEIGHT,
    height: Math.max(span * MINUTE_HEIGHT - space[1], space[6]),
    left: percent(lane / lanes),
    width: percent(1 / lanes),
  };
}

const nowPlace = (minutes: number) => ({ top: minutes * MINUTE_HEIGHT });

function Block({ block, context }: BlockProps) {
  const { item } = block;
  const words = lineWords(item, context);
  return (
    <View className="absolute pr-1" style={blockPlace(block)}>
      <PressableSurface
        a11y={{
          label: [item.title, words.time, words.meta].join(', '),
          role: 'button',
          selected: context.selected === item.id,
        }}
        onPress={() => context.onOpen(item)}
        pressed={{ fill: true }}
        className={clsx(
          'bg-surface flex-1 flex-row gap-2 overflow-hidden rounded-sm px-2 py-1',
          context.selected === item.id && 'bg-fill'
        )}>
        <EventBar look={barOf(item, context.now, context.viewer)} />
        <View className="min-w-0 flex-1">
          <Text variant="label" numberOfLines={1} struck={item.done}>
            {item.title}
          </Text>
          <Text variant="caption" tone="3" numberOfLines={1}>
            {words.time}
          </Text>
        </View>
      </PressableSurface>
    </View>
  );
}

export function DayView({ items, range, context, empty }: DayViewProps) {
  const { date, now } = context;
  const plan = dayHours({ items, range, now }, date);
  return (
    <View>
      {items.length === 0 ? empty : null}
      {plan.allDay.map((item) => (
        <AgendaLine
          key={item.id}
          title={item.title}
          words={lineWords(item, context)}
          look={barOf(item, now, context.viewer)}
          struck={item.done}
          selected={context.selected === item.id}
          onPress={() => context.onOpen(item)}
        />
      ))}
      <View className="mt-3 flex-row">
        <View className="w-20">
          {plan.hours.map((hour) => (
            <View key={hour} style={HOUR_ROW}>
              <Text variant="caption" tone="3" numberOfLines={1}>
                {date.formatHour(hour)}
              </Text>
            </View>
          ))}
        </View>
        <View className="relative min-w-0 flex-1">
          {plan.hours.map((hour) => (
            <View key={hour} style={HOUR_ROW} className="border-line border-t" />
          ))}
          {plan.blocks.map((block) => (
            <Block key={block.item.id} block={block} context={context} />
          ))}
          {plan.now === null ? null : (
            <View className="bg-alert absolute inset-x-0 h-0.5" style={nowPlace(plan.now)} />
          )}
        </View>
      </View>
    </View>
  );
}
