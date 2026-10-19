import type { ICameraClip } from '@/core/interfaces';
import type { CameraClipTrigger } from '@/core/types';

export const TAMPER_EVIDENCE_WINDOW_S = 300;
export const TAMPER_EVIDENCE_KEEP = 4;
export const TAMPER_EVIDENCE_VIDEO_MAX_BYTES = 6 * 1024 * 1024;
export const TAMPER_EVIDENCE_MAX_ITEMS = 6;

export type TamperEvidenceTarget = {
  cameraId: number;
  onsetAt: number;
};

export type TamperEvidenceItem = {
  clipId: string;
  trigger: CameraClipTrigger;
  contentType: string;
  startedAt: number;
  durationMs: number;
  base64: string;
};

export type TamperEvidence = TamperEvidenceTarget & {
  items: TamperEvidenceItem[];
  keptAt: number;
};

export const evidenceScope = (target: TamperEvidenceTarget): string => `${target.cameraId}-${target.onsetAt}`;

const EVIDENCE_TRIGGERS: ReadonlySet<CameraClipTrigger> = new Set(['tamper', 'look']);

const isImage = (clip: Pick<ICameraClip, 'contentType'>): boolean => clip.contentType.startsWith('image/');

export function pickEvidenceClips(clips: readonly ICameraClip[], target: TamperEvidenceTarget): ICameraClip[] {
  const near = clips.filter(
    (clip) =>
      clip.cameraId === String(target.cameraId) &&
      EVIDENCE_TRIGGERS.has(clip.trigger) &&
      Math.abs(clip.startedAt - target.onsetAt) <= TAMPER_EVIDENCE_WINDOW_S &&
      (isImage(clip) || clip.byteSize <= TAMPER_EVIDENCE_VIDEO_MAX_BYTES),
  );
  const ranked = [...near].sort((left, right) => {
    if (isImage(left) !== isImage(right)) return isImage(left) ? -1 : 1;
    return Math.abs(left.startedAt - target.onsetAt) - Math.abs(right.startedAt - target.onsetAt);
  });
  const video = ranked.find((clip) => !isImage(clip) && clip.trigger === 'tamper');
  const images = ranked.filter(isImage).slice(0, TAMPER_EVIDENCE_MAX_ITEMS - (video ? 1 : 0));
  return video ? [...images, video] : images;
}

export function retainedScopes(index: readonly string[], scope: string, keep: number): string[] {
  return [scope, ...index.filter((entry) => entry !== scope)].slice(0, Math.max(1, keep));
}

export function evidenceImages(evidence: TamperEvidence | null): TamperEvidenceItem[] {
  return evidence ? evidence.items.filter((item) => item.contentType.startsWith('image/')) : [];
}

export function evidenceVideo(evidence: TamperEvidence | null): TamperEvidenceItem | null {
  return evidence?.items.find((item) => !item.contentType.startsWith('image/')) ?? null;
}

export function lastGoodFrame(evidence: TamperEvidence | null): TamperEvidenceItem | null {
  const frames = evidenceImages(evidence).filter((item) => item.trigger === 'tamper');
  return frames[0] ?? null;
}

export function lookCrops(evidence: TamperEvidence | null): TamperEvidenceItem[] {
  return evidenceImages(evidence).filter((item) => item.trigger === 'look');
}
