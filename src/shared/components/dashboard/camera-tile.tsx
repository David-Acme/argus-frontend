import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type CameraTileProps = {
  name: string;
  model: string;
  ip: string;
  isOnline: boolean;
  isEnabled: boolean;
  resolution?: string;
  recordMode?: string;
  onPress?: () => void;
};

export function CameraTile({
  name,
  model,
  ip,
  isOnline,
  isEnabled,
  resolution,
  recordMode,
  onPress,
}: CameraTileProps) {
  const offline = !isOnline || !isEnabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${offline ? 'offline' : 'online'}`}
      className="bg-card min-w-[150px] flex-1 gap-3 rounded-[20px] p-3 shadow-md shadow-black/[0.06] active:opacity-80"
      onPress={onPress}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="bg-surface-secondary size-9 items-center justify-center rounded-full">
          <Icon
            name="video"
            className={cn('size-4', offline ? 'text-muted-foreground' : 'text-foreground')}
          />
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className={cn('size-2 rounded-full', offline ? 'bg-muted-foreground' : 'bg-success')} />
          {resolution ? (
            <Text className="text-muted-foreground text-[11px] font-medium">{resolution}</Text>
          ) : null}
        </View>
      </View>
      <View className="gap-0.5">
        <Text className="text-[14px] font-semibold" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-muted-foreground text-[11px]" numberOfLines={1}>
          {model || ip}
        </Text>
      </View>
      {recordMode ? (
        <View className="bg-surface-secondary self-start rounded-full px-2 py-0.5">
          <Text className="text-foreground-secondary text-[11px] font-medium">{recordMode}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
