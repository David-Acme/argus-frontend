import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';

type CameraSnapshotViewProps = {
  cameraId: string;
};

const SNAPSHOT_ASPECT = 16 / 9;

export function CameraSnapshotView({ cameraId }: CameraSnapshotViewProps) {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void cameraControlService.snapshot(cameraId).then((result) => {
      if (!active) return;
      if (result.ok && result.info?.image) {
        setImage(result.info.image);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      active = false;
    };
  }, [cameraId]);

  return (
    <View
      className="bg-surface-secondary dark:bg-card-secondary w-full items-center justify-center overflow-hidden rounded-2xl"
      style={{ aspectRatio: SNAPSHOT_ASPECT }}>
      {image ? (
        <Image
          source={{ uri: image }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <View className="items-center gap-1.5">
          <Icon name="video" className="text-muted-foreground size-6" />
          <Text variant="micro">{failed ? t('screens.voice.camera.snapshot-failed') : t('screens.voice.camera.snapshot-loading')}</Text>
        </View>
      )}
    </View>
  );
}
