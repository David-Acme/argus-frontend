import { Media } from '@/shared/ui/media';
import { Button } from '@/shared/ui/button';
import { useOfflineNotice } from '@/shared/components/layout/use-offline-notice';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraFaceOf } from '@/shared/libs/camera-face';
import { CameraPreview } from '@/features/cameras';
import type { CameraTile, ClipTile } from '@/features/home/model/camera-tiles';

export type CameraMediaProps = {
  tile: CameraTile;
  detail: string;
  frame?: string;
  order: number;
  fill?: boolean;
  onOpen: (cameraId: string) => void;
};

export type ClipMediaProps = {
  clip: ClipTile;
  detail: string;
  named: boolean;
  onOpen: (cameraId: string) => void;
};

export function CameraMedia({ tile, detail, frame, order, fill, onOpen }: CameraMediaProps) {
  const { t } = useTranslation();
  const unreachable = useOfflineNotice();
  const face = cameraFaceOf({
    state: tile.state,
    framed: frame !== undefined,
    reachable: !unreachable,
  });
  return (
    <Media
      name={tile.name}
      detail={face.stale ? t('screens.home.camera-sections.offline') : detail || undefined}
      live={face.live ? t('screens.home.camera-sections.live') : undefined}
      dormant={face.dormant}
      frame={frame && !face.dormant ? { uri: frame } : undefined}
      fill={fill}
      onPress={() => onOpen(tile.id)}>
      {tile.state === 'live' && !face.stale ? (
        <CameraPreview cameraId={tile.id} order={order} />
      ) : null}
    </Media>
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
