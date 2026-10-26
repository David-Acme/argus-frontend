import { useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text, type TextTone } from '@/shared/ui/text';
import { RowPosition } from './row-position';

export type RowMeta = { text: string; mono: true };

export type RowProps = {
  title: string;
  meta?: string | RowMeta;
  metaTone?: TextTone;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  danger?: boolean;
  struck?: boolean;
  testID?: string;
};

type RowBodyProps = Omit<RowProps, 'onPress' | 'testID'>;

type TrailingProps = Pick<RowProps, 'trailing' | 'chevron'>;

function Trailing({ trailing, chevron }: TrailingProps) {
  if (!trailing && !chevron) return null;
  return (
    <View className="gap-row-trail-gap flex-row items-center">
      {typeof trailing === 'string' ? (
        <Text variant="feed" tone="3">
          {trailing}
        </Text>
      ) : (
        trailing
      )}
      {chevron ? <Icon name="chev" size="small" tone="text-3" /> : null}
    </View>
  );
}

function RowBody({
  title,
  meta,
  metaTone,
  leading,
  trailing,
  chevron,
  danger,
  struck,
}: RowBodyProps) {
  const { index } = useContext(RowPosition);
  return (
    <>
      {index > 0 ? (
        <View className="right-row-x left-row-x border-line absolute top-0 border-t" />
      ) : null}
      {leading}
      <View className="min-w-0 flex-1">
        <Text variant="rowTitle" tone={danger ? 'alert' : 'default'} struck={struck}>
          {title}
        </Text>
        {meta ? (
          <View className="mt-row-meta-gap">
            <Text variant="rowMeta" tone={metaTone} mono={typeof meta !== 'string'}>
              {typeof meta === 'string' ? meta : meta.text}
            </Text>
          </View>
        ) : null}
      </View>
      <Trailing trailing={trailing} chevron={chevron} />
    </>
  );
}

const FRAME = 'min-h-row flex-row items-center gap-row-gap px-row-x py-row-y';

function spokenLabel({ title, meta, trailing }: Pick<RowProps, 'title' | 'meta' | 'trailing'>) {
  const value = typeof trailing === 'string' ? trailing : undefined;
  const line = typeof meta === 'string' ? meta : meta?.text;
  return [title, line, value].filter(Boolean).join(', ');
}

export function Row({ onPress, testID, ...body }: RowProps) {
  if (!onPress) {
    return (
      <View className={FRAME} testID={testID}>
        <RowBody {...body} />
      </View>
    );
  }
  return (
    <PressableSurface
      a11y={{ label: spokenLabel(body), role: 'button' }}
      onPress={onPress}
      pressed={{ fill: true }}
      testID={testID}
      className={FRAME}>
      <RowBody {...body} />
    </PressableSurface>
  );
}
