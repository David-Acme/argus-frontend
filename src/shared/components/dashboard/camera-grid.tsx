import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { CameraTile } from './camera-tile';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';

type CameraGridProps = {
  cameras: readonly ICameraCacheRow[];
  emptyLabel: string;
  onSelect?: (id: string) => void;
};

export function CameraGrid({ cameras, emptyLabel, onSelect }: CameraGridProps) {
  if (cameras.length === 0) {
    return (
      <Panel>
        <EmptyState variant="inline" icon="video" title={emptyLabel} />
      </Panel>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-3">
      {cameras.map((camera) => (
        <View key={camera.id} className="min-w-[150px] flex-1 basis-[45%]">
          <CameraTile
            name={camera.name}
            model={camera.modelLabel}
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
