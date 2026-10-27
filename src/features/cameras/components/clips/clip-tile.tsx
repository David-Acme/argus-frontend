import type { ICameraClip } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Media } from '@/shared/ui/media';
import { useClipPoster } from '@/features/cameras/hooks/use-clip-poster';

export type ClipTileProps = {
  clip: ICameraClip;
  cameraName: string;
  detail: string;
  onOpen: (clip: ICameraClip) => void;
};

export function ClipTile({ clip, cameraName, detail, onOpen }: ClipTileProps) {
  const { t } = useTranslation();
  const poster = useClipPoster(clip);
  const open = () => onOpen(clip);
  return (
    <Media
      name={cameraName}
      detail={detail}
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
  );
}
