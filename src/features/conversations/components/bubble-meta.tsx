import { View } from 'react-native';
import { Icon } from '@/shared/ui/icon';
import type { IconGlyph, IconTone } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import type { BubbleStatus } from '@/features/conversations/model/receipts';

export type BubbleMetaProps = { time: string; note: string | null; status: BubbleStatus | null };

type Glyph = { name: IconGlyph; tone: IconTone };

const GLYPHS: Readonly<Record<Exclude<BubbleStatus, 'failed'>, Glyph>> = {
  sending: { name: 'clock', tone: 'text-2' },
  sent: { name: 'check', tone: 'text-2' },
  delivered: { name: 'checks', tone: 'text-2' },
  read: { name: 'checks', tone: 'receipt-read' },
};

export function BubbleMeta({ time, note, status }: BubbleMetaProps) {
  const glyph = status && status !== 'failed' ? GLYPHS[status] : null;
  return (
    <View aria-hidden className="ml-2 shrink-0 flex-row items-center gap-1 self-end">
      <Text variant="caption" tone="2" numberOfLines={1}>
        {note ? `${note} · ${time}` : time}
      </Text>
      {glyph ? <Icon name={glyph.name} size="meta" tone={glyph.tone} /> : null}
    </View>
  );
}
