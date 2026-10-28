import { View } from 'react-native';
import type { ICameraClip } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Stack } from '@/shared/ui/layout';
import { Media, MediaPlayer } from '@/shared/ui/media';
import { Notice } from '@/shared/ui/notice';
import type { ClipPlayback } from '@/features/cameras/hooks/use-clip-playback';
import { useClipPoster } from '@/features/cameras/hooks/use-clip-poster';
import { isImageClip } from '@/features/cameras/model/camera-clips';

export type ClipStageProps = {
  playback: ClipPlayback;
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
};

type StillProps = { clip: ICameraClip; image: string | null };

type VideoProps = Omit<ClipStageProps, 'playback'> & { clip: ICameraClip; playback: ClipPlayback };

function ClipStill({ clip, image }: StillProps) {
  const { t } = useTranslation();
  const poster = useClipPoster({ id: clip.id, cameraId: clip.cameraId });
  const shown = image ?? poster;
  return (
    <Media name={t('screens.cameras.clips.image')} frame={shown ? { uri: shown } : undefined} />
  );
}

function ClipVideo({ clip, playback, title, subtitle, onRetry }: VideoProps) {
  const poster = useClipPoster({ id: clip.id, cameraId: clip.cameraId });
  return (
    <MediaPlayer
      source={playback.media}
      failed={playback.state === 'failed'}
      poster={poster ?? undefined}
      title={title}
      subtitle={subtitle}
      onRetry={onRetry}
    />
  );
}

export function ClipStage({ playback, title, subtitle, onRetry }: ClipStageProps) {
  const { t } = useTranslation();
  const { clip } = playback;
  if (playback.state === 'idle' || !clip) return null;
  const still = isImageClip(clip);
  return (
    <View className="mt-section-top">
      <Stack gap={3}>
        {still ? (
          <ClipStill clip={clip} image={playback.image} />
        ) : playback.state === 'unsupported' ? null : (
          <ClipVideo
            clip={clip}
            playback={playback}
            title={title}
            subtitle={subtitle}
            onRetry={onRetry}
          />
        )}
        {playback.state === 'unsupported' || (still && playback.state === 'failed') ? (
          <Notice
            inline
            tone="attention"
            icon="alert"
            title={
              playback.state === 'unsupported'
                ? t('screens.cameras.clips.unsupported')
                : t('screens.cameras.clips.play-failed')
            }
          />
        ) : null}
      </Stack>
    </View>
  );
}
