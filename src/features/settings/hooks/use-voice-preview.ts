import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useState } from 'react';
import { TTS_PREVIEW_CLIPS } from '../constants/tts-preview-clips';

export type VoicePreview = {
  playing: string | null;
  toggle: (clip: string) => void;
};

const STATUS_INTERVAL_MS = 100;

export function useVoicePreview(): VoicePreview {
  const player = useAudioPlayer(null, { updateInterval: STATUS_INTERVAL_MS });
  const status = useAudioPlayerStatus(player);
  const [clip, setClip] = useState<string | null>(null);
  const playing = status.playing ? clip : null;

  const toggle = (next: string) => {
    if (playing === next) {
      player.pause();
      setClip(null);
      return;
    }
    const source = TTS_PREVIEW_CLIPS[next];
    if (source === undefined) return;
    player.replace(source);
    player.play();
    setClip(next);
  };

  return { playing, toggle };
}
