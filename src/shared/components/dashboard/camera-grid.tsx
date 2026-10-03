import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
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
};

export function CameraGrid({ cameras, emptyLabel, onSelect }: CameraGridProps) {
  if (cameras.length === 0) {
    return (
      <View className="bg-card items-center justify-center gap-2 rounded-[20px] px-6 py-8 shadow-md shadow-black/[0.05]">
        <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
          <Icon name="video" className="text-muted-foreground size-5" />
        </View>
        <Text className="text-muted-foreground text-center text-caption">{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-3">
      {cameras.map((camera) => (
        <View key={camera.id} className="min-w-[150px] flex-1 basis-[45%]">
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
        </View>
      ))}
    </View>
  );
}

export type { CameraGridItem };
