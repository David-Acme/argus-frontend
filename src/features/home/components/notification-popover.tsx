import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Popover, PopoverContent, PopoverTrigger, type PopoverTriggerRef } from '@/shared/components/ui/popover';
import { Text } from '@/shared/components/ui/text';
import { IconButton } from '@/shared/components/ui/icon-button';
import { useTranslation } from '@/shared/hooks/use-translation';
import { NotificationThreadRow } from '@/features/home/components/notification-thread-row';
import {
  unreadIdsOf,
  withUnreadSnapshot,
  type NotificationThread,
} from '@/features/home/model/notification-threads';

type NotificationPopoverProps = {
  unreadCount: number;
  threads: readonly NotificationThread[];
  now: number;
  onOpen: () => void;
  openRequest?: boolean;
};

type OpenedSnapshot = { ids: ReadonlySet<string>; count: number };

const PREVIEW_LIMIT = 4;

const NO_SNAPSHOT: OpenedSnapshot = { ids: new Set(), count: 0 };

export function NotificationPopover({ unreadCount, threads, now, onOpen, openRequest = false }: NotificationPopoverProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState<OpenedSnapshot>(NO_SNAPSHOT);
  const triggerRef = useRef<PopoverTriggerRef>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (openRequest) frame.current = requestAnimationFrame(() => triggerRef.current?.open());
  }, [openRequest]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  const preview = withUnreadSnapshot(threads.slice(0, PREVIEW_LIMIT), opened.ids);
  const summary =
    opened.count === 0
      ? t('screens.home.notifications-caught-up')
      : opened.count === 1
        ? t('screens.home.notifications-new-one')
        : t('screens.home.notifications-new', { count: String(opened.count) });

  const openChange = (open: boolean) => {
    if (!open) {
      setOpened(NO_SNAPSHOT);
      return;
    }
    setOpened({ ids: new Set(unreadIdsOf(threads)), count: unreadCount });
    if (unreadCount > 0) onOpen();
  };

  return (
    <Popover onOpenChange={openChange}>
      <PopoverTrigger asChild ref={triggerRef}>
        <IconButton
          icon="bell"
          label={t('screens.home.notifications')}
          accessibilityHint={unreadCount > 0 ? t('screens.home.notifications-open-hint') : undefined}
          badge={unreadCount}
        />
      </PopoverTrigger>
      <PopoverContent sideOffset={2}>
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="body" className="font-semibold">
            {t('screens.home.notifications')}
          </Text>
          <Text variant="caption" className="text-foreground-secondary">
            {summary}
          </Text>
        </View>

        {preview.length === 0 ? (
          <Text variant="caption" className="text-foreground-secondary mt-2">
            {t('screens.home.notifications-empty')}
          </Text>
        ) : (
          <View className="mt-3 gap-2">
            {preview.map((thread) => (
              <NotificationThreadRow key={thread.key} thread={thread} now={now} compact />
            ))}
          </View>
        )}
      </PopoverContent>
    </Popover>
  );
}
