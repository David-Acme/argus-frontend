import type { ICameraClip, ICameraClips } from '@/core/interfaces';
import type { CameraClipTrigger, TranslateFn, TranslationKey } from '@/core/types';

export const CLIP_PAGE_SIZE = 20;

export type ClipCursor = {
  before: number;
  beforeId: number;
};

const TRIGGER_LABEL: Record<CameraClipTrigger, TranslationKey> = {
  motion: 'screens.cameras.clips.trigger.motion',
  event: 'screens.cameras.clips.trigger.event',
  continuous: 'screens.cameras.clips.trigger.continuous',
  tamper: 'screens.cameras.clips.trigger.tamper',
  look: 'screens.cameras.clips.trigger.look',
};

function toInt(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

const KNOWN_TRIGGERS: readonly CameraClipTrigger[] = ['motion', 'event', 'continuous', 'tamper', 'look'];

function triggerOf(value: unknown): CameraClipTrigger {
  return KNOWN_TRIGGERS.find((trigger) => trigger === value) ?? 'event';
}

export function isImageClip(clip: Pick<ICameraClip, 'contentType'>): boolean {
  return clip.contentType.startsWith('image/');
}

export function clipOfRow(row: unknown): ICameraClip | null {
  if (typeof row !== 'object' || row === null) return null;
  const source = row as Record<string, unknown>;
  const id = toInt(source.id);
  const cameraId = toInt(source.cameraId);
  if (id <= 0 || cameraId <= 0) return null;
  return {
    id: String(id),
    cameraId: String(cameraId),
    trigger: triggerOf(source.trigger),
    contentType: toText(source.contentType, 'video/mp4'),
    codec: toText(source.codec),
    startedAt: toInt(source.startedAt),
    durationMs: toInt(source.durationMs),
    byteSize: toInt(source.byteSize),
    createdAt: toInt(source.createdAt),
    expiresAt: toInt(source.expiresAt),
  };
}

export function clipRowsOf(payload: ICameraClips | null | undefined): ICameraClip[] {
  if (!payload || !Array.isArray(payload.clips)) return [];
  return payload.clips
    .map((row) => clipOfRow(row))
    .filter((clip): clip is ICameraClip => clip !== null);
}

export function mergeClipPages(
  existing: readonly ICameraClip[],
  incoming: readonly ICameraClip[],
): ICameraClip[] {
  const seen = new Set(existing.map((clip) => clip.id));
  return [...existing, ...incoming.filter((clip) => !seen.has(clip.id))];
}

export function olderClipCursor(clips: readonly ICameraClip[]): ClipCursor | null {
  const last = clips[clips.length - 1];
  if (!last) return null;
  return { before: last.createdAt, beforeId: Number(last.id) };
}

export function clipTriggerLabelKey(trigger: CameraClipTrigger): TranslationKey {
  return TRIGGER_LABEL[trigger] ?? 'screens.cameras.clips.trigger.event';
}

export function formatClipDuration(durationMs: number): string {
  const total = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatClipSize(byteSize: number): string {
  if (byteSize <= 0) return '';
  const megabytes = byteSize / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(byteSize / 1024))} KB`;
}

export function clipRowSubtitle(t: TranslateFn, clip: ICameraClip, at: string): string {
  return [
    at,
    formatClipDuration(clip.durationMs),
    formatClipSize(clip.byteSize),
    t(clipTriggerLabelKey(clip.trigger)),
  ]
    .filter(Boolean)
    .join(' · ');
}

export function clipImageUri(contentType: string, base64: string): string {
  return `data:${contentType};base64,${base64}`;
}
