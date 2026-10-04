import { useState } from 'react';
import { View } from 'react-native';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Text } from '@/shared/components/ui/text';
import { IconButton } from '@/shared/components/ui/icon-button';
import { NotificationThreadRow } from '@/features/home/components/notification-thread-row';
import {
  isThreadRead,
  unreadIdsOf,
  type NotificationThread,
} from '@/features/home/model/notification-threads';

type NotificationPopoverProps = {
  label: string;
  title: string;
  summary: string;
  emptyLabel: string;
  unreadCount: number;
  threads: readonly NotificationThread[];
  now: number;
  onSeen?: (ids: readonly string[]) => void;
};

const PREVIEW_LIMIT = 4;

export function NotificationPopover({
  label,
  title,
  summary,
  emptyLabel,
  unreadCount,
  threads,
  now,
  onSeen,
}: NotificationPopoverProps) {
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const preview = threads.slice(0, PREVIEW_LIMIT);

  const markSeen = (open: boolean) => {
    if (!open) {
      setFresh(new Set());
      return;
    }
    const unread = preview.filter((thread) => !isThreadRead(thread));
    setFresh(new Set(unread.map((thread) => thread.key)));
    const ids = unreadIdsOf(unread);
    if (ids.length > 0) onSeen?.(ids);
  };

  return (
    <Popover onOpenChange={markSeen}>
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
                fresh={fresh.has(thread.key)}
              />
            ))}
          </View>
        )}
      </PopoverContent>
    </Popover>
  );
}
