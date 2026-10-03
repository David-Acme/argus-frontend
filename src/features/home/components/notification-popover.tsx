import { useState } from 'react';
import { View } from 'react-native';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { IconButton } from '@/shared/components/ui/icon-button';

export type NotificationPreview = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
};

type NotificationPopoverProps = {
  label: string;
  title: string;
  summary: string;
  emptyLabel: string;
  unreadCount: number;
  items: readonly NotificationPreview[];
  onSeen?: (ids: readonly string[]) => void;
};

const PREVIEW_LIMIT = 4;

export function NotificationPopover({
  label,
  title,
  summary,
  emptyLabel,
  unreadCount,
  items,
  onSeen,
}: NotificationPopoverProps) {
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const preview = items.slice(0, PREVIEW_LIMIT);

  const markSeen = (open: boolean) => {
    if (!open) {
      setFresh(new Set());
      return;
    }
    const unread = preview.filter((item) => !item.isRead).map((item) => item.id);
    setFresh(new Set(unread));
    if (unread.length > 0) onSeen?.(unread);
  };

  return (
    <Popover onOpenChange={markSeen}>
      <PopoverTrigger asChild>
        <IconButton icon="bell" label={label} badge={unreadCount} />
      </PopoverTrigger>
      <PopoverContent sideOffset={2}>
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="body" className="font-semibold">{title}</Text>
          <Text variant="caption" className="text-foreground-secondary">{summary}</Text>
        </View>

        {preview.length === 0 ? (
          <Text variant="caption" className="text-foreground-secondary mt-2">{emptyLabel}</Text>
        ) : (
          <View className="mt-3 gap-3">
            {preview.map((item) => (
              <View key={item.id} className="flex-row gap-2.5">
                <View
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    item.isRead && !fresh.has(item.id) ? 'bg-border' : 'bg-interactive'
                  )}
                />
                <View className="min-w-0 flex-1">
                  <Text className="text-caption font-medium" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text
                    variant="caption" className="text-foreground-secondary"
                    numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </PopoverContent>
    </Popover>
  );
}
