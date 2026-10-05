import type { RTCVideoViewProps } from '@livekit/react-native-webrtc';
import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import type { CameraRtcStream } from '@/core/types';

type CameraRtcVideoProps = {
  stream: CameraRtcStream | null;
  visible: boolean;
};

function streamUrl(stream: CameraRtcStream | null): string | null {
  return stream && 'toURL' in stream ? stream.toURL() : null;
}

export function CameraRtcVideo({ stream, visible }: CameraRtcVideoProps) {
  const [RtcView, setRtcView] = useState<ComponentType<RTCVideoViewProps> | null>(null);
  const url = streamUrl(stream);

  useEffect(() => {
    if (!url || RtcView) return;
    let mounted = true;
    void import('@livekit/react-native-webrtc').then((module) => {
      if (mounted) setRtcView(() => module.RTCView);
    });
    return () => {
      mounted = false;
    };
  }, [RtcView, url]);

  if (!url || !RtcView) return null;
  return (
    <RtcView
      streamURL={url}
      objectFit="contain"
      style={[StyleSheet.absoluteFill, { opacity: visible ? 1 : 0 }]}
    />
  );
}
