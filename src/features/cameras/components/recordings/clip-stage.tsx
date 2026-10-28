import { useState } from 'react';
import { View } from 'react-native';
import type { ICameraClip } from '@/core/interfaces';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { illustration, layout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Stack } from '@/shared/ui/layout';
import { Media } from '@/shared/ui/media';
import { Meter } from '@/shared/ui/meter';
import { Notice } from '@/shared/ui/notice';
import { ClipPlayer } from '@/features/cameras/components/clip-player';
import type { ClipPlayback } from '@/features/cameras/hooks/use-clip-playback';
import { useClipPoster } from '@/features/cameras/hooks/use-clip-poster';
import { formatClipDuration, isImageClip } from '@/features/cameras/model/camera-clips';
import { clipDurationMs } from '@/features/cameras/model/clip-media';

export type ClipStageProps = { playback: ClipPlayback; closable?: boolean };

type StillProps = { clip: ICameraClip; image: string | null };

type VideoProps = { clip: ICameraClip; playback: ClipPlayback; closable: boolean };

type ProgressProps = { durationMs: number };

const PROGRESS_TICK_MS = 250;

const FRAME = { aspectRatio: layout.mediaAspect, backgroundColor: illustration.media };

function ClipStill({ clip, image }: StillProps) {
  const { t } = useTranslation();
  const poster = useClipPoster({ id: clip.id, cameraId: clip.cameraId });
  const shown = image ?? poster;
  return (
    <Media name={t('screens.cameras.clips.image')} frame={shown ? { uri: shown } : undefined} />
  );
}

function ClipProgress({ durationMs }: ProgressProps) {
  const { t } = useTranslation();
  const [startedAt] = useState(() => Date.now());
  const now = useNow(PROGRESS_TICK_MS);
  const elapsed = Math.min(durationMs, now - startedAt);
  return (
    <Meter
      fraction={elapsed / Math.max(1, durationMs)}
      label={t('screens.cameras.clips.playing', {
        elapsed: formatClipDuration(elapsed),
        total: formatClipDuration(durationMs),
      })}
    />
  );
}

function ClipVideo({ clip, playback, closable }: VideoProps) {
  const poster = useClipPoster({ id: clip.id, cameraId: clip.cameraId });
  return (
    <View className="rounded-media overflow-hidden" style={FRAME}>
      {poster ? (
        <View className="absolute inset-0">
          <Media fill frame={{ uri: poster }} />
        </View>
      ) : null}
      {playback.file ? (
        <ClipPlayer
          className="h-full w-full"
          file={playback.file}
          onEnded={closable ? playback.close : playback.finish}
        />
      ) : null}
    </View>
  );
}

export function ClipStage({ playback, closable = true }: ClipStageProps) {
  const { t } = useTranslation();
  const { clip } = playback;
  if (playback.state === 'idle' || !clip) return null;
  const failed = playback.state === 'failed' || playback.state === 'unsupported';
  const still = isImageClip(clip);
  return (
    <View className="mt-section-top">
      <Stack gap={3}>
        {still ? (
          <ClipStill clip={clip} image={playback.image} />
        ) : failed ? null : (
          <ClipVideo clip={clip} playback={playback} closable={closable} />
        )}
        {failed ? (
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
        {closable ? (
          <Button
            compact
            variant="ghost"
            label={t('screens.cameras.clips.close')}
            onPress={playback.close}
          />
        ) : playback.file && playback.ended ? (
          <Button
            compact
            variant="ghost"
            icon="play"
            label={t('screens.cameras.clips.replay')}
            onPress={playback.replay}
          />
        ) : playback.file ? (
          <ClipProgress key={playback.round} durationMs={clipDurationMs(playback.file.fragments)} />
        ) : null}
      </Stack>
    </View>
  );
}
