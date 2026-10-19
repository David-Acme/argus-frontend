import { useCallback, useEffect, useState } from 'react';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { viewCacheService } from '@/core/services/view-cache.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { evidenceTargetOf, sightNoticeOf } from '@/features/security';
import { evidenceScope, type TamperEvidence, type TamperEvidenceTarget } from '@/features/cameras/model/tamper-evidence';
import { tamperEvidenceService } from '@/features/cameras/services/tamper-evidence.service';

export type TamperEvidenceStatus = 'idle' | 'loading' | 'failed';

export type TamperEvidenceState = {
  evidence: TamperEvidence | null;
  status: TamperEvidenceStatus;
  retry: () => void;
};

const KEEPER_WINDOW = 20;

export function useTamperEvidence(target: TamperEvidenceTarget | null, enabled: boolean): TamperEvidenceState {
  const scope = target ? evidenceScope(target) : undefined;
  const cached = useViewCacheValue<TamperEvidence>(VIEW_CACHE_KEYS.tamperEvidence, scope);
  const evidence = target && cached ? cached : null;
  const [failedScope, setFailedScope] = useState<string | null>(null);
  const cameraId = target?.cameraId ?? 0;
  const onsetAt = target?.onsetAt ?? 0;
  const status: TamperEvidenceStatus =
    !enabled || evidence || scope === undefined ? 'idle' : failedScope === scope ? 'failed' : 'loading';

  const fetchEvidence = useCallback(() => {
    if (cameraId <= 0 || onsetAt <= 0) return;
    const wanted = { cameraId, onsetAt };
    void tamperEvidenceService.keep(wanted).then((found) => {
      if (!found) setFailedScope(evidenceScope(wanted));
    });
  }, [cameraId, onsetAt]);

  const retry = useCallback(() => {
    setFailedScope(null);
    fetchEvidence();
  }, [fetchEvidence]);

  useEffect(() => {
    if (!enabled || evidence) return;
    fetchEvidence();
  }, [enabled, evidence, fetchEvidence]);

  return { evidence, status, retry };
}

function keepFrom(rows: readonly INotificationPreviewCacheRow[], seen: Set<string>): void {
  for (const row of rows.slice(0, KEEPER_WINDOW)) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const kind = typeof row.data.kind === 'string' ? row.data.kind : null;
    const target = evidenceTargetOf(sightNoticeOf(kind, row.data));
    if (target) void tamperEvidenceService.keep(target);
  }
}

export function useTamperEvidenceKeeper(): void {
  const { clips } = useCapabilities();
  const reads = clips.view;

  useEffect(() => {
    if (!reads) return undefined;
    const seen = new Set<string>();
    const scan = () =>
      keepFrom(
        viewCacheService.rowsSnapshot<INotificationPreviewCacheRow>(VIEW_CACHE_KEYS.dashboardNotifications),
        seen,
      );
    scan();
    return viewCacheService.subscribe(VIEW_CACHE_KEYS.dashboardNotifications, undefined, scan);
  }, [reads]);
}
