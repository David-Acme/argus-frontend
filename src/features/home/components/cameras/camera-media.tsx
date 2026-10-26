import type { MediaDormant } from '@/shared/ui/media';
import { Media } from '@/shared/ui/media';
import { Button } from '@/shared/ui/button';
import type { CameraTile, ClipTile } from '@/features/home/model/camera-tiles';
import { useTranslation } from '@/shared/hooks/use-translation';

export type CameraMediaProps = {
  tile: CameraTile;
  detail: string;
  frame?: string;
  fill?: boolean;
  onOpen: (cameraId: string) => void;
};

export type ClipMediaProps = {
  clip: ClipTile;
  detail: string;
  named: boolean;
  onOpen: (cameraId: string) => void;
};

const DORMANT: Record<CameraTile['state'], MediaDormant | undefined> = {
  live: undefined,
  private: 'privacy',
  off: 'off',
  offline: 'off',
};

export function CameraMedia({ tile, detail, frame, fill, onOpen }: CameraMediaProps) {
  const { t } = useTranslation();
  return (
    <Media
      name={tile.name}
      detail={detail || undefined}
      live={tile.state === 'live' ? t('screens.home.camera-sections.live') : undefined}
      dormant={DORMANT[tile.state]}
      frame={frame ? { uri: frame } : undefined}
      fill={fill}
      onPress={() => onOpen(tile.id)}
    />
  );
}

export function ClipMedia({ clip, detail, named, onOpen }: ClipMediaProps) {
  const { t } = useTranslation();
  const open = () => onOpen(clip.cameraId);
  return (
    <Media
      name={
        named
          ? t('screens.home.camera-sections.clip', { camera: clip.cameraName })
          : clip.cameraName
      }
      detail={detail}
      onPress={open}
      center={
        <Button
          iconOnly
          glass
          icon="play"
          iconSize="small"
          label={t('screens.home.camera-sections.play', { camera: clip.cameraName })}
          onPress={open}
        />
      }
    />
  );
}
