import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import type { ClipFile } from '@/features/cameras/model/clip-media';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type ClipPlayerProps = {
  file: ClipFile | null;
  muted?: boolean;
  onEnded?: () => void;
  onAudioFailed?: (stopped: boolean) => void;
  className?: string;
};

const VIDEO_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  background: CAMERA_LIVE_BACKGROUND,
} as const;

export function ClipPlayer({
  file,
  muted = true,
  onEnded,
  onAudioFailed,
  className,
}: ClipPlayerProps) {
  const { t } = useTranslation();
  const video = useRef<HTMLVideoElement | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element || !file) return undefined;
    setUnsupported(false);

    const media = new MediaSource();
    const url = URL.createObjectURL(media);
    element.src = url;
    let closed = false;

    const onOpen = () => {
      if (closed) return;
      const mime = `video/mp4; codecs="${file.track?.codec ?? 'avc1.42E01E'}"`;
      let buffer: SourceBuffer;
      try {
        buffer = media.addSourceBuffer(mime);
      } catch {
        setUnsupported(true);
        return;
      }
      const queue: Uint8Array[] = [file.init, ...file.fragments.map((fragment) => fragment.bytes)];
      const pump = () => {
        if (closed || buffer.updating) return;
        const next = queue.shift();
        if (!next) {
          if (media.readyState === 'open') media.endOfStream();
          void element.play().catch(() => undefined);
          return;
        }
        buffer.appendBuffer(toArrayBuffer(next));
      };
      buffer.addEventListener('updateend', pump);
      pump();
    };

    media.addEventListener('sourceopen', onOpen);

    return () => {
      closed = true;
      element.pause();
      element.removeAttribute('src');
      element.load();
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const ended = useRef(onEnded);
  useEffect(() => {
    ended.current = onEnded;
    if (file && !muted) onAudioFailed?.(false);
  }, [file, muted, onAudioFailed, onEnded]);

  if (!file) return null;

  return (
    <View
      className={cn('overflow-hidden rounded-2xl', className)}
      style={{ aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }}>
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        style={VIDEO_STYLE}
        onEnded={() => ended.current?.()}
      />
      {unsupported ? (
        <View className="absolute inset-0 items-center justify-center px-4">
          <Text variant="caption" className="text-center">
            {t('screens.cameras.clips.unsupported')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
