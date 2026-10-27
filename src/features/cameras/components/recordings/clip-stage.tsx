import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { illustration, layout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Stack } from '@/shared/ui/layout';
import { Media } from '@/shared/ui/media';
import { Notice } from '@/shared/ui/notice';
import { ClipPlayer } from '@/features/cameras/components/clip-player';
import type { ClipPlayback } from '@/features/cameras/hooks/use-clip-playback';

export type ClipStageProps = { playback: ClipPlayback; closable?: boolean };

const FRAME = { aspectRatio: layout.mediaAspect, backgroundColor: illustration.media };

export function ClipStage({ playback, closable = true }: ClipStageProps) {
  const { t } = useTranslation();
  if (playback.state === 'idle') return null;
  const failed = playback.state === 'failed' || playback.state === 'unsupported';
  return (
    <View className="mt-section-top">
      <Stack gap={3}>
        {playback.image ? (
          <Media name={t('screens.cameras.clips.image')} frame={{ uri: playback.image }} />
        ) : failed ? null : (
          <View className="rounded-media overflow-hidden" style={FRAME}>
            <ClipPlayer file={playback.file} onEnded={closable ? playback.close : undefined} />
          </View>
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
        ) : playback.file ? (
          <Button
            compact
            variant="ghost"
            icon="play"
            label={t('screens.cameras.clips.replay')}
            onPress={playback.replay}
          />
        ) : null}
      </Stack>
    </View>
  );
}
