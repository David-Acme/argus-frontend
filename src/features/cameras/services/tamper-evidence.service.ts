import type { ICameraClip } from '@/core/interfaces';
import { viewCacheService } from '@/core/services/view-cache.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { clipRowsOf } from '@/features/cameras/model/camera-clips';
import {
  TAMPER_EVIDENCE_KEEP,
  evidenceScope,
  pickEvidenceClips,
  retainedScopes,
  type TamperEvidence,
  type TamperEvidenceItem,
  type TamperEvidenceTarget,
} from '@/features/cameras/model/tamper-evidence';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';

async function fetchItem(clip: ICameraClip): Promise<TamperEvidenceItem | null> {
  const preview = await cameraClipsService.preview(clip.cameraId, clip.id);
  if (!preview.ok || !preview.info) return null;
  const content = await cameraClipsService.content(preview.info.token);
  if (!content.ok || !content.info) return null;
  return {
    clipId: clip.id,
    trigger: clip.trigger,
    contentType: content.info.mimeType || clip.contentType,
    startedAt: clip.startedAt,
    durationMs: clip.durationMs,
    base64: content.info.base64,
  };
}

class TamperEvidenceService {
  private inFlight = new Map<string, Promise<TamperEvidence | null>>();

  read(target: TamperEvidenceTarget): TamperEvidence | null {
    return viewCacheService.readValue<TamperEvidence>(VIEW_CACHE_KEYS.tamperEvidence, evidenceScope(target));
  }

  keep(target: TamperEvidenceTarget): Promise<TamperEvidence | null> {
    const scope = evidenceScope(target);
    const cached = this.read(target);
    if (cached && cached.items.length > 0) return Promise.resolve(cached);
    const running = this.inFlight.get(scope);
    if (running) return running;
    const work = this.fetch(target).finally(() => this.inFlight.delete(scope));
    this.inFlight.set(scope, work);
    return work;
  }

  private async fetch(target: TamperEvidenceTarget): Promise<TamperEvidence | null> {
    const listed = await cameraClipsService.list(String(target.cameraId));
    if (!listed.ok) return null;
    const picked = pickEvidenceClips(clipRowsOf(listed.info), target);
    if (picked.length === 0) return null;
    const items: TamperEvidenceItem[] = [];
    for (const clip of picked) {
      const item = await fetchItem(clip);
      if (item) items.push(item);
    }
    if (items.length === 0) return null;
    const evidence: TamperEvidence = { ...target, items, keptAt: Date.now() };
    const scope = evidenceScope(target);
    viewCacheService.writeValue(VIEW_CACHE_KEYS.tamperEvidence, evidence, scope);
    const index = retainedScopes(
      viewCacheService.readValue<string[]>(VIEW_CACHE_KEYS.tamperEvidence) ?? [],
      scope,
      TAMPER_EVIDENCE_KEEP,
    );
    viewCacheService.writeValue(VIEW_CACHE_KEYS.tamperEvidence, index);
    viewCacheService.retainScopes(VIEW_CACHE_KEYS.tamperEvidence, new Set(index));
    return evidence;
  }
}

export const tamperEvidenceService = new TamperEvidenceService();
