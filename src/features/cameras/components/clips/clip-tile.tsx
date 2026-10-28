import { View } from 'react-native';
import type { ICameraClip } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Media } from '@/shared/ui/media';
import { Text } from '@/shared/ui/text';
import { useClipPoster } from '@/features/cameras/hooks/use-clip-poster';
import { clipCaption } from '@/features/cameras/model/camera-clips';

export type ClipTileProps = {
  clip: ICameraClip;
  cameraName: string;
  moment: string;
  showCamera?: boolean;
  duration?: boolean;
  onOpen: (clip: ICameraClip) => void;
};

export function ClipTile({
  clip,
  cameraName,
  moment,
  showCamera = true,
  duration = true,
  onOpen,
}: ClipTileProps) {
  const { t } = useTranslation();
  const poster = useClipPoster(clip);
  const caption = clipCaption({ clip, camera: showCamera ? cameraName : null, moment });
  const open = () => onOpen(clip);
  return (
    <View className="gap-2">
      <Media
        label={caption.spoken}
        frame={poster ? { uri: poster } : undefined}
        onPress={open}
        center={
          <Button
            iconOnly
            glass
            icon="play"
            iconSize="small"
            label={t('screens.cameras.clips.play', { camera: cameraName })}
            onPress={open}
          />
        }
      />
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 shrink grow">
          <Text variant="rowMeta" tone="2" numberOfLines={1}>
            {caption.line}
          </Text>
        </View>
        {duration && caption.duration ? (
          <Text variant="rowMeta" tone="3">
            {caption.duration}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
