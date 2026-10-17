import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import type { CameraRecordMode } from '@/core/types';
import { recordModeLabelKey } from '@/features/cameras';
import { cn } from '@/shared/libs/utils';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { useTranslation } from '@/shared/hooks/use-translation';

type CameraTileProps = {
  name: string;
  model: string;
  ip: string;
  isOnline: boolean;
  isEnabled: boolean;
  recordMode?: CameraRecordMode;
  onPress?: () => void;
};

export function CameraTile({
  name,
  model,
  ip,
  isOnline,
  isEnabled,
  recordMode,
  onPress,
}: CameraTileProps) {
  const { t } = useTranslation();
  const offline = !isOnline || !isEnabled;
  const statusLabel = t(
    !isEnabled
      ? 'screens.cameras.status.disabled'
      : isOnline
        ? 'screens.cameras.status.online'
        : 'screens.cameras.status.offline'
  );
  const recordLabel = t(recordModeLabelKey(recordMode ?? 'events'));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${statusLabel}`}
      className="bg-card min-w-[150px] flex-1 gap-3 rounded-3xl p-3 shadow-md shadow-black/[0.06] active:opacity-80"
      onPress={onPress}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="bg-surface-secondary size-9 items-center justify-center rounded-full">
          <Icon
            name="video"
            className={cn('size-4', offline ? 'text-muted-foreground' : 'text-foreground')}
          />
        </View>
        <View className={cn('size-2 rounded-full', offline ? 'bg-muted-foreground' : 'bg-success')} />
      </View>
      <View className="gap-0.5">
        <Text variant="label" className="font-semibold" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-muted-foreground text-micro" numberOfLines={1}>
          {model || ip}
        </Text>
      </View>
      {recordMode ? (
        <StatusBadge label={recordLabel} />
      ) : null}
    </Pressable>
  );
}
