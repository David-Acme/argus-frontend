import { View } from 'react-native';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { DashboardIconButton } from './dashboard-icon-button';

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
};

/** Rows shown in the panel; beyond this it belongs on a screen, not a popover. */
const PREVIEW_LIMIT = 4;

/**
 * Bell action plus its panel. Anchored to the trigger by the popover primitive,
 * so it stays under the bell on a phone and on a desktop window alike.
 */
export function NotificationPopover({
  label,
  title,
  summary,
  emptyLabel,
  unreadCount,
  items,
}: NotificationPopoverProps) {
  const preview = items.slice(0, PREVIEW_LIMIT);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <DashboardIconButton icon="bell" label={label} badge={unreadCount} />
      </PopoverTrigger>
      {/* Tight to the bell: a wide gap reads as a floating panel, not as
          something the button opened. */}
      <PopoverContent sideOffset={2}>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-[15px] font-semibold">{title}</Text>
          <Text className="text-foreground-secondary text-xs">{summary}</Text>
        </View>

        {preview.length === 0 ? (
          <Text className="text-foreground-secondary mt-2 text-sm leading-5">{emptyLabel}</Text>
        ) : (
          <View className="mt-3 gap-3">
            {preview.map((item) => (
              <View key={item.id} className="flex-row gap-2.5">
                <View
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    item.isRead ? 'bg-border' : 'bg-interactive'
                  )}
                />
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-medium" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text
                    className="text-foreground-secondary text-xs leading-4"
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
