import type {
  NoteEngine,
  NoteStatus,
} from '@/features/conversations/services/note-player/note-player';

const blobOf = (base64: string, mime: string): Blob => {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
};

export const noteEngine: NoteEngine = {
  open: (content, onStatus) => {
    const url = URL.createObjectURL(blobOf(content.base64, content.mimeType));
    const audio = new Audio(url);
    const report = (ended: boolean) => {
      const status: NoteStatus = {
        positionMs: audio.currentTime * 1000,
        durationMs: Number.isFinite(audio.duration) ? audio.duration * 1000 : 0,
        playing: !audio.paused,
        ended,
      };
      onStatus(status);
    };
    const tick = () => report(false);
    const end = () => report(true);
    audio.addEventListener('timeupdate', tick);
    audio.addEventListener('play', tick);
    audio.addEventListener('pause', tick);
    audio.addEventListener('ended', end);
    return {
      play: () => void audio.play().catch(() => report(false)),
      pause: () => audio.pause(),
      seek: (ms) => {
        audio.currentTime = ms / 1000;
      },
      setRate: (rate) => {
        audio.playbackRate = rate;
      },
      release: () => {
        audio.pause();
        audio.removeEventListener('timeupdate', tick);
        audio.removeEventListener('play', tick);
        audio.removeEventListener('pause', tick);
        audio.removeEventListener('ended', end);
        URL.revokeObjectURL(url);
      },
    };
  },
};
