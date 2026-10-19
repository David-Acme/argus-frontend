import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { CameraTile } from '@/features/home/components/camera-tile';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';
import { cameraPrivacyMasked, cameraPrivacyUnconfirmed } from '@/shared/libs/camera-privacy';

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
            recordMode={camera.recordMode}
            masked={cameraPrivacyMasked(camera.privacyState, camera.privacyObeyed)}
            unconfirmed={cameraPrivacyUnconfirmed(camera.privacyState, camera.privacyObeyed)}
            onPress={onSelect ? () => onSelect(camera.id) : undefined}
          />
        </View>
      ))}
    </View>
  );
}
