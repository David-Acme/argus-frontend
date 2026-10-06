import { View } from 'react-native';
import type { ActivityItem } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { describeActivity, type ActivityContext } from '@/features/activity/model/activity-text';

type ActivityRowProps = {
  item: ActivityItem;
  names: ActivityContext['names'];
  moduleName: ActivityContext['moduleName'];
};

export function ActivityRow({ item, names, moduleName }: ActivityRowProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const line = describeActivity(item, { names, moduleName, t });
  const at = new Date(item.createdAt * 1000);
  const when = `${date.formatDayMonth(at)}, ${date.formatTime(at)}`;
  const detail = item.ipAddress
    ? t('screens.activity.detail-ip', { when, module: moduleName(item.module), ip: item.ipAddress })
    : t('screens.activity.detail', { when, module: moduleName(item.module) });

  return (
    <View
      accessible
      accessibilityLabel={`${line.title}. ${detail}`}
      className="min-h-14 flex-row items-center gap-3 rounded-2xl px-3 py-2">
      <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
        <Icon name={line.icon} className="text-foreground-secondary size-5" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="body" className="font-medium" numberOfLines={2}>
          {line.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </View>
  );
}
