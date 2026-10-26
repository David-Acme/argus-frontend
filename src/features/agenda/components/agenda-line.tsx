import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { BarLook, LineWords } from '@/features/agenda/model/agenda-lines';
import { EventBar } from '@/features/agenda/components/event-bar';

export type AgendaLineProps = {
  title: string;
  words: LineWords;
  look: BarLook;
  struck?: boolean;
  selected?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  testID?: string;
};

type LineBodyProps = Omit<AgendaLineProps, 'selected' | 'onPress' | 'testID'>;

const FRAME = 'min-h-row flex-row gap-3 rounded-button px-4 py-3';

function LineBody({ title, words, look, struck, trailing }: LineBodyProps) {
  const free = look === 'free';
  return (
    <>
      <View className="w-19">
        <Text variant={words.allDay ? 'caption' : 'feed'} numberOfLines={1}>
          {words.time}
        </Text>
        {words.state ? (
          <Text variant="rowMeta" tone="3">
            {words.state}
          </Text>
        ) : null}
      </View>
      <EventBar look={look} />
      <View className="min-w-0 flex-1">
        <Text variant="rowTitle" tone={struck || free ? '3' : 'default'} struck={struck}>
          {title}
        </Text>
        {words.meta ? (
          <View className="mt-row-meta-gap">
            <Text variant="rowMeta" tone={words.alert ? 'alert' : '2'}>
              {words.meta}
            </Text>
          </View>
        ) : null}
      </View>
      {trailing ? <View className="flex-row items-start gap-2">{trailing}</View> : null}
    </>
  );
}

export function AgendaLine({ selected, onPress, testID, ...body }: AgendaLineProps) {
  if (!onPress)
    return (
      <View className={FRAME} testID={testID}>
        <LineBody {...body} />
      </View>
    );
  return (
    <PressableSurface
      a11y={{
        label: [body.title, body.words.time, body.words.state, body.words.meta]
          .filter(Boolean)
          .join(', '),
        role: 'button',
        selected,
      }}
      onPress={onPress}
      pressed={{ fill: true }}
      testID={testID}
      className={clsx(FRAME, 'web:hover:bg-fill', selected && 'bg-fill')}>
      <LineBody {...body} />
    </PressableSurface>
  );
}
