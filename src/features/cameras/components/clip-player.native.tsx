import { ArgusCameraView, type ArgusCameraViewMethods } from 'argus-camera';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { callback } from 'react-native-nitro-modules';
import type { ClipFile } from '@/features/cameras/model/clip-media';
import { useClipQueue, type ClipSink } from '@/features/cameras/hooks/use-clip-playback';
import { cn } from '@/shared/libs/utils';

type ClipPlayerProps = {
  file: ClipFile | null;
  onEnded?: () => void;
  className?: string;
};

const PLAYER_FRAME = { aspectRatio: 16 / 9 };

export function ClipPlayer({ file, onEnded, className }: ClipPlayerProps) {
  const [player, setPlayer] = useState<ArgusCameraViewMethods | null>(null);
  const bindPlayer = useCallback((ref: ArgusCameraViewMethods) => {
    setPlayer(ref);
  }, []);
  const ended = useCallback(() => onEnded?.(), [onEnded]);
  const sink = useMemo<ClipSink | null>(
    () =>
      player ? { push: (type, keyframe, data) => player.pushFragment(type, keyframe, data) } : null,
    [player]
  );
  useClipQueue(file, sink, ended);

  return (
    <View className={cn('overflow-hidden rounded-2xl', className)} style={PLAYER_FRAME}>
      <ArgusCameraView
        hybridRef={callback(bindPlayer)}
        active={file !== null}
        muted
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
