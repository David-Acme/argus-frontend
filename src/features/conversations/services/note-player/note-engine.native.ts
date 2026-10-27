import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioMode } from 'expo-audio';
import type { NoteEngine } from '@/features/conversations/services/note-player/note-player';

const SPEAKER: AudioMode = {
  playsInSilentMode: true,
  interruptionMode: 'doNotMix',
  allowsRecording: false,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
};

export const noteEngine: NoteEngine = {
  open: (content, onStatus) => {
    void setAudioModeAsync(SPEAKER).catch(() => undefined);
    const player = createAudioPlayer({ uri: `data:${content.mimeType};base64,${content.base64}` });
    const subscription = player.addListener('playbackStatusUpdate', (status) =>
      onStatus({
        positionMs: status.currentTime * 1000,
        durationMs: status.duration * 1000,
        playing: status.playing,
        ended: status.didJustFinish,
      })
    );
    return {
      play: () => player.play(),
      pause: () => player.pause(),
      seek: (ms) => void player.seekTo(ms / 1000),
      setRate: (rate) => player.setPlaybackRate(rate),
      release: () => {
        subscription.remove();
        player.remove();
      },
    };
  },
};
