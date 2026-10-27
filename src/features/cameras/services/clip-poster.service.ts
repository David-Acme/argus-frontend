import { useAuthStore } from '@/core/stores/auth.store';
import { clipImageUri } from '@/features/cameras/model/camera-clips';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';

export type ClipPosterKey = { id: string; cameraId: string };

type Listener = () => void;

const POSTER_LIMIT = 160;

const PARALLEL_LOADS = 2;

class ClipPosterStore {
  private readonly posters = new Map<string, string | null>();
  private readonly pending = new Set<string>();
  private readonly waiting: ClipPosterKey[] = [];
  private readonly listeners = new Set<Listener>();
  private running = 0;
  private session = 0;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  poster(clipId: string): string | null {
    return this.posters.get(clipId) ?? null;
  }

  request(clip: ClipPosterKey): void {
    if (this.posters.has(clip.id) || this.pending.has(clip.id)) return;
    this.pending.add(clip.id);
    this.waiting.push(clip);
    this.drain();
  }

  clear(): void {
    this.session += 1;
    this.posters.clear();
    this.pending.clear();
    this.waiting.length = 0;
    this.notify();
  }

  private drain(): void {
    while (this.running < PARALLEL_LOADS && this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) void this.load(next);
    }
  }

  private async load(clip: ClipPosterKey): Promise<void> {
    const session = this.session;
    this.running += 1;
    const result = await cameraClipsService.poster(clip.cameraId, clip.id).catch(() => null);
    this.running -= 1;
    if (session === this.session) {
      this.pending.delete(clip.id);
      this.remember(
        clip.id,
        result?.ok && result.info?.base64
          ? clipImageUri(result.info.mimeType || 'image/jpeg', result.info.base64)
          : null
      );
    }
    this.drain();
  }

  private remember(clipId: string, poster: string | null): void {
    this.posters.set(clipId, poster);
    const oldest = this.posters.size > POSTER_LIMIT ? this.posters.keys().next().value : undefined;
    if (oldest !== undefined) this.posters.delete(oldest);
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const clipPosters = new ClipPosterStore();

useAuthStore.subscribe((state) => {
  if (state.status !== 'signed-in') clipPosters.clear();
});
