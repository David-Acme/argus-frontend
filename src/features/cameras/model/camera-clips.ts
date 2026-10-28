import type { ICameraClip, ICameraClipContent, ICameraClips } from '@/core/interfaces';
import type { CameraClipTrigger, RemotePage, TranslateFn, TranslationKey } from '@/core/types';
import { DAY_MS, startOfLocalDay } from '@/shared/libs/day';
import { formatDuration } from '@/shared/libs/duration';

export const CLIP_FEED_PAGE = 24;

export const CLIP_FEED_ALL = 'all';

const CAMERA_SCOPE = 'camera:';

export type ClipCursor = string;

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

const KNOWN_TRIGGERS: readonly CameraClipTrigger[] = [
  'motion',
  'event',
  'continuous',
  'tamper',
  'look',
];

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

export function clipRowsOf(payload: unknown): ICameraClip[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const clips: unknown = (payload as Partial<ICameraClips>).clips;
  if (!Array.isArray(clips)) return [];
  return clips.map((row) => clipOfRow(row)).filter((clip): clip is ICameraClip => clip !== null);
}

export function clipFeedScope(cameraId: string | null): string {
  return cameraId ? `${CAMERA_SCOPE}${cameraId}` : CLIP_FEED_ALL;
}

export function clipFeedCamera(scope: string): string | null {
  return scope.startsWith(CAMERA_SCOPE) ? scope.slice(CAMERA_SCOPE.length) || null : null;
}

export function clipFeedPath(scope: string, cursor: ClipCursor | null, limit: number): string {
  const camera = clipFeedCamera(scope);
  const query = new URLSearchParams({ limit: String(limit), cursor: cursor ?? '' });
  if (camera) query.set('cameraId', camera);
  return `/camera/clips?${query.toString()}`;
}

export function compareClips(left: ICameraClip, right: ICameraClip): number {
  return right.createdAt - left.createdAt || Number(right.id) - Number(left.id);
}

export function clipPageOf(payload: unknown): RemotePage<ICameraClip, ClipCursor> {
  if (typeof payload !== 'object' || payload === null) return { rows: [], next: null };
  const source = payload as Record<string, unknown>;
  const rows = clipRowsOf({ clips: source.items }).sort(compareClips);
  const cursor = toText(source.nextCursor);
  return { rows, next: source.hasMore === true && cursor !== '' ? cursor : null };
}

export function visibleClips(
  clips: readonly ICameraClip[],
  cameras: ReadonlyMap<string, unknown>
): ICameraClip[] {
  return clips.filter((clip) => cameras.has(clip.cameraId));
}

export function clipTriggerLabelKey(trigger: CameraClipTrigger): TranslationKey {
  return TRIGGER_LABEL[trigger] ?? 'screens.cameras.clips.trigger.event';
}

export function formatClipSize(byteSize: number): string {
  if (byteSize <= 0) return '';
  const megabytes = byteSize / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(byteSize / 1024))} KB`;
}

export type ClipMomentInput = {
  at: number;
  now: number;
  t: TranslateFn;
  time: (value: Date) => string;
  day: (value: Date) => string;
};

export function clipMoment({ at, now, t, time, day }: ClipMomentInput): string {
  const date = new Date(at);
  const clock = time(date);
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(at)) / DAY_MS);
  if (days <= 0) return t('screens.cameras.clips.today-at', { time: clock });
  if (days === 1) return t('screens.cameras.clips.yesterday-at', { time: clock });
  return t('screens.cameras.clips.day-at', { day: day(date), time: clock });
}

export function clipDetail(clip: ICameraClip, moment: string): string {
  return isImageClip(clip) ? moment : `${moment} · ${formatDuration(clip.durationMs)}`;
}

export type ClipCaptionInput = { clip: ICameraClip; camera: string | null; moment: string };

export type ClipCaption = { line: string; duration: string | null; spoken: string };

export function clipCaption({ clip, camera, moment }: ClipCaptionInput): ClipCaption {
  return {
    line: camera ? `${camera} · ${moment}` : moment,
    duration: isImageClip(clip) ? null : formatDuration(clip.durationMs),
    spoken: [camera, clipDetail(clip, moment)].filter(Boolean).join(', '),
  };
}

export function clipGlyph(clip: Pick<ICameraClip, 'contentType'>): 'image' | 'play' {
  return isImageClip(clip) ? 'image' : 'play';
}

export function clipFacts(t: TranslateFn, clip: ICameraClip): string {
  return [
    isImageClip(clip) ? t('screens.cameras.clips.still') : formatDuration(clip.durationMs),
    formatClipSize(clip.byteSize),
    t(clipTriggerLabelKey(clip.trigger)),
  ]
    .filter(Boolean)
    .join(' · ');
}

export function clipImageUri(contentType: string, base64: string): string {
  return `data:${contentType};base64,${base64}`;
}

export function clipColumns(width: number, wideAt: number, widestAt: number): number {
  if (width >= widestAt) return 4;
  return width >= wideAt ? 3 : 2;
}

export function clipGridRows<T>(items: readonly T[], columns: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    const row: (T | null)[] = items.slice(start, start + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

export function clipContentOf(payload: unknown): ICameraClipContent | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const source = payload as Record<string, unknown>;
  const base64 = toText(source.base64);
  if (base64 === '') return null;
  return {
    mimeType: toText(source.mimeType, 'image/jpeg'),
    base64,
    durationMs: toInt(source.durationMs),
  };
}
