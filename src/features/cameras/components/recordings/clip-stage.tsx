import { useState } from 'react';
import { View } from 'react-native';
import type { ICameraClip } from '@/core/interfaces';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { illustration, layout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Stack } from '@/shared/ui/layout';
import { Text } from '@/shared/ui/text';
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

type ClipSound = { muted: boolean; lost: boolean };

type VideoProps = {
  clip: ICameraClip;
  playback: ClipPlayback;
  closable: boolean;
  sound: ClipSound;
  onAudioFailed: (stopped: boolean) => void;
};

type ProgressProps = { durationMs: number };

type ControlsProps = {
  playback: ClipPlayback;
  sound: ClipSound;
  onToggleSound: () => void;
};

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

function ClipVideo({ clip, playback, closable, sound, onAudioFailed }: VideoProps) {
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
          muted={closable || sound.muted || sound.lost}
          onEnded={closable ? playback.close : playback.finish}
          onAudioFailed={onAudioFailed}
        />
      ) : null}
    </View>
  );
}

function ClipControls({ playback, sound, onToggleSound }: ControlsProps) {
  const { t } = useTranslation();
  if (!playback.file) return null;
  if (playback.ended)
    return (
      <Button
        compact
        variant="ghost"
        icon="play"
        label={t('screens.cameras.clips.replay')}
        onPress={playback.replay}
      />
    );
  return (
    <View className="flex-row items-center gap-3">
      <View className="min-w-0 flex-1">
        <ClipProgress key={playback.round} durationMs={clipDurationMs(playback.file.fragments)} />
      </View>
      {sound.lost ? (
        <Text variant="meta" tone="3">
          {t('screens.cameras.clips.no-audio')}
        </Text>
      ) : (
        <Button
          iconOnly
          compact
          variant="ghost"
          icon={sound.muted ? 'mute' : 'speaker'}
          label={t(
            sound.muted ? 'screens.cameras.clips.sound-on' : 'screens.cameras.clips.sound-off'
          )}
          onPress={onToggleSound}
        />
      )}
    </View>
  );
}

export function ClipStage({ playback, closable = true }: ClipStageProps) {
  const { t } = useTranslation();
  const [sound, setSound] = useState<ClipSound>({ muted: false, lost: false });
  const { clip } = playback;
  const audioFailed = (stopped: boolean) => {
    setSound((current) => (current.lost ? current : { ...current, lost: true }));
    if (stopped) playback.replay();
  };
  if (playback.state === 'idle' || !clip) return null;
  const failed = playback.state === 'failed' || playback.state === 'unsupported';
  const still = isImageClip(clip);
  return (
    <View className="mt-section-top">
      <Stack gap={3}>
        {still ? (
          <ClipStill clip={clip} image={playback.image} />
        ) : failed ? null : (
          <ClipVideo
            clip={clip}
            playback={playback}
            closable={closable}
            sound={sound}
            onAudioFailed={audioFailed}
          />
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
        ) : (
          <ClipControls
            playback={playback}
            sound={sound}
            onToggleSound={() => setSound((current) => ({ ...current, muted: !current.muted }))}
          />
        )}
      </Stack>
    </View>
  );
}
