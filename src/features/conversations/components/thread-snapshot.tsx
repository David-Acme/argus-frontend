import { View } from 'react-native';
import { ThreadItemView } from '@/features/conversations/components/thread-item';
import type { ThreadItemViewProps } from '@/features/conversations/components/thread-item';
import type { ThreadItem } from '@/features/conversations/model/thread-list';

export type ThreadSnapshotProps = Omit<ThreadItemViewProps, 'item'> & {
  items: readonly ThreadItem[];
  bottom: number;
};

export const SNAPSHOT_TEST_ID = 'thread-snapshot';

export function ThreadSnapshot({ items, bottom, ...view }: ThreadSnapshotProps) {
  if (items.length === 0) return null;
  const pad = { paddingBottom: bottom };
  return (
    <View
      testID={SNAPSHOT_TEST_ID}
      pointerEvents="none"
      aria-hidden
      className="bg-bg absolute inset-0 justify-end overflow-hidden"
      style={pad}>
      {items.map((item) => (
        <ThreadItemView key={item.key} item={item} {...view} />
      ))}
    </View>
  );
}
