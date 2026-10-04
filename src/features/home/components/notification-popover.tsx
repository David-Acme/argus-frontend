import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Text } from '@/shared/components/ui/text';
import { IconButton } from '@/shared/components/ui/icon-button';
import { NotificationThreadRow } from '@/features/home/components/notification-thread-row';
import type { NotificationThread } from '@/features/home/model/notification-threads';

type NotificationPopoverProps = {
  label: string;
  title: string;
  summary: string;
  emptyLabel: string;
  markAllLabel: string;
  unreadCount: number;
  threads: readonly NotificationThread[];
  now: number;
  onReadThread: (thread: NotificationThread) => void;
  onReadAll: () => void;
};

const PREVIEW_LIMIT = 4;

export function NotificationPopover({
  label,
  title,
  summary,
  emptyLabel,
  markAllLabel,
  unreadCount,
  threads,
  now,
  onReadThread,
  onReadAll,
}: NotificationPopoverProps) {
  const preview = threads.slice(0, PREVIEW_LIMIT);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton icon="bell" label={label} badge={unreadCount} />
      </PopoverTrigger>
      <PopoverContent sideOffset={2}>
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="body" className="font-semibold">
            {title}
          </Text>
          <Text variant="caption" className="text-foreground-secondary">
            {summary}
          </Text>
        </View>

        {preview.length === 0 ? (
          <Text variant="caption" className="text-foreground-secondary mt-2">
            {emptyLabel}
          </Text>
        ) : (
          <View className="mt-3 gap-2">
            {preview.map((thread) => (
              <NotificationThreadRow
                key={thread.key}
                thread={thread}
                now={now}
                compact
                onRead={onReadThread}
              />
            ))}
          </View>
        )}

        {unreadCount > 0 ? (
          <View className="border-border-subtle mt-3 flex-row justify-end border-t pt-2">
            <Button variant="ghost" size="sm" onPress={onReadAll}>
              <Text>{markAllLabel}</Text>
            </Button>
          </View>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
