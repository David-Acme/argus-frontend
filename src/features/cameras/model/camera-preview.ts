import {
  CAMERA_STREAM_FRAME_HEADER_BYTES,
  CAMERA_STREAM_FRAME_MAGIC,
} from '@/features/cameras/constants';

export type PreviewState = 'waiting' | 'connecting' | 'live';

export type PreviewWish = {
  key: string;
  cameraId: string;
  order: number;
  visible: boolean;
};

export type MediaHeader = {
  type: number;
  keyframe: boolean;
  subId: number;
};

export type ViewportBox = { x: number; y: number; width: number; height: number };

export type ViewportSize = { width: number; height: number };

const KEYFRAME_FLAG = 0x01;

export function grantedPreviews(wishes: readonly PreviewWish[], cap: number): ReadonlySet<string> {
  const ranked = wishes
    .map((wish, arrival) => ({ wish, arrival }))
    .filter(({ wish }) => wish.visible)
    .sort((a, b) => a.wish.order - b.wish.order || a.arrival - b.arrival);
  const granted = new Set<string>();
  const cameras = new Set<string>();
  for (const { wish } of ranked) {
    if (granted.size >= cap) break;
    if (cameras.has(wish.cameraId)) continue;
    cameras.add(wish.cameraId);
    granted.add(wish.key);
  }
  return granted;
}

export function sameKeys(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
}

export function inViewport(box: ViewportBox, size: ViewportSize): boolean {
  if (box.width <= 0 || box.height <= 0) return false;
  return (
    box.x < size.width && box.y < size.height && box.x + box.width > 0 && box.y + box.height > 0
  );
}

export function readMediaHeader(data: ArrayBuffer): MediaHeader | null {
  if (data.byteLength < CAMERA_STREAM_FRAME_HEADER_BYTES) return null;
  const header = new DataView(data, 0, CAMERA_STREAM_FRAME_HEADER_BYTES);
  if (header.getUint8(0) !== CAMERA_STREAM_FRAME_MAGIC) return null;
  return {
    type: header.getUint8(2),
    keyframe: (header.getUint8(3) & KEYFRAME_FLAG) === KEYFRAME_FLAG,
    subId: header.getUint16(4),
  };
}

export function previewSubscribeFrame(cameraId: number, fastStart: boolean): string {
  return JSON.stringify({
    type: 'camera:subscribe',
    payload: { cameraId, quality: 'sub', preview: true, fastStart },
  });
}

export function previewAckFrame(subId: number, bytes: number): string {
  return JSON.stringify({ type: 'camera:ack', payload: { subId, bytes } });
}

export function previewUnsubscribeFrame(subId: number): string {
  return JSON.stringify({ type: 'camera:unsubscribe', payload: { subId } });
}

export function firstInOrder<T extends { order: number }>(items: readonly T[]): T | null {
  let first: T | null = null;
  for (const item of items) if (!first || item.order < first.order) first = item;
  return first;
}
