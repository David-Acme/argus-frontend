import { View } from 'react-native';
import { Icon } from '@/shared/ui/icon';
import type { IconGlyph, IconTone } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { glyphShownOf, metaLabelOf } from '@/features/conversations/model/bubble-meta';
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
  const glyph = glyphShownOf(status) ? GLYPHS[status] : null;
  return (
    <View aria-hidden className="shrink-0 flex-row items-center gap-1">
      <Text variant="caption" tone="2" numberOfLines={1}>
        {metaLabelOf(time, note)}
      </Text>
      {glyph ? <Icon name={glyph.name} size="meta" tone={glyph.tone} /> : null}
    </View>
  );
}
