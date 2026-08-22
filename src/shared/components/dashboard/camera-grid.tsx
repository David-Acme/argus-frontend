import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { itemIn } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';
import { CameraTile } from './camera-tile';

type CameraGridItem = {
  id: string;
  name: string;
  model: string;
  ip: string;
  isOnline: boolean;
  isEnabled: boolean;
  resolution?: string;
  recordMode?: string;
};

type CameraGridProps = {
  cameras: readonly CameraGridItem[];
  emptyLabel: string;
  onSelect?: (id: string) => void;
  /** Takes the height it is given; used in the side column of wide windows. */
  fill?: boolean;
};

/** Wrapping grid: two per row on phones, as many as fit on wider windows. */
export function CameraGrid({ cameras, emptyLabel, onSelect, fill = false }: CameraGridProps) {
  if (cameras.length === 0) {
    return (
      <View
        className={cn(
          'bg-card items-center justify-center gap-2 rounded-[20px] px-6 py-8 shadow-md shadow-black/[0.05]',
          fill && 'flex-1'
        )}>
        <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
          <Icon name="video" className="text-muted-foreground size-5" />
        </View>
        <Text className="text-muted-foreground text-center text-[13px]">{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View className={cn('flex-row flex-wrap content-start gap-3', fill && 'flex-1')}>
      {cameras.map((camera, index) => (
        <Animated.View
          key={camera.id}
          entering={itemIn.delay(60 + index * 50).duration(300)}
          className="min-w-[150px] flex-1 basis-[45%]">
          <CameraTile
            name={camera.name}
            model={camera.model}
            ip={camera.ip}
            isOnline={camera.isOnline}
            isEnabled={camera.isEnabled}
            resolution={camera.resolution}
            recordMode={camera.recordMode}
            onPress={onSelect ? () => onSelect(camera.id) : undefined}
          />
        </Animated.View>
      ))}
    </View>
  );
}

export type { CameraGridItem };
