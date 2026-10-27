import {
  grantedPreviews,
  sameKeys,
  type PreviewWish,
} from '@/features/cameras/model/camera-preview';

type Listener = () => void;

const NONE: ReadonlySet<string> = new Set();

class PreviewBoard {
  private readonly wishes = new Map<string, PreviewWish>();
  private readonly live = new Set<string>();
  private readonly listeners = new Set<Listener>();
  private granted: ReadonlySet<string> = NONE;
  private cap = 0;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  isGranted(key: string): boolean {
    return this.granted.has(key);
  }

  isLive(cameraId: string): boolean {
    return this.live.has(cameraId);
  }

  setCap(cap: number): void {
    if (this.cap === cap) return;
    this.cap = cap;
    this.recompute();
  }

  wish(wish: PreviewWish): void {
    const known = this.wishes.get(wish.key);
    if (
      known?.visible === wish.visible &&
      known.order === wish.order &&
      known.cameraId === wish.cameraId
    )
      return;
    this.wishes.set(wish.key, wish);
    this.recompute();
  }

  forget(key: string): void {
    if (this.wishes.delete(key)) this.recompute();
  }

  markLive(cameraId: string, live: boolean): void {
    if (live) this.live.add(cameraId);
    else this.live.delete(cameraId);
  }

  private recompute(): void {
    const next = grantedPreviews([...this.wishes.values()], this.cap);
    if (sameKeys(next, this.granted)) return;
    this.granted = next;
    for (const listener of this.listeners) listener();
  }
}

export const previewBoard = new PreviewBoard();
