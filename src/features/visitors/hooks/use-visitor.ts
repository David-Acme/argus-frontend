import { useCallback } from 'react';
import type { VisitorDetail } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { visitorService } from '@/features/visitors/services/visitor.service';

export function useVisitor(id: number) {
  const { t } = useTranslation();
  const load = useCallback(() => visitorService.detail(id), [id]);
  const detail = useRemoteResource<VisitorDetail>({
    cacheKey: VIEW_CACHE_KEYS.visitorDetail,
    scope: String(id),
    load,
    enabled: id > 0,
  });
  const { run, pending } = useServiceAction();
  const { mutate } = detail;

  const removeSample = useCallback(
    async (sampleId: number) => {
      let before: VisitorDetail | null = null;
      const result = await run({
        confirm: {
          title: t('screens.visitors.sample-delete-title'),
          description: t('screens.visitors.sample-delete-description'),
          confirmLabel: t('screens.visitors.delete'),
          intent: 'danger',
        },
        call: async () => {
          mutate((previous) => {
            before = previous;
            return previous
              ? {
                  ...previous,
                  samples: previous.samples.filter((sample) => sample.id !== sampleId),
                  sampleCount: Math.max(0, previous.sampleCount - 1),
                }
              : previous;
          });
          const answer = await visitorService.removeSample(id, sampleId);
          if (!answer.ok) mutate(() => before);
          return answer;
        },
        errorTitle: t('screens.visitors.delete-error'),
      });
      return result !== null;
    },
    [id, mutate, run, t]
  );

  const split = useCallback(
    async (sampleIds: number[]) => {
      const result = await run({
        call: () => visitorService.split(id, sampleIds),
        success: t('screens.visitors.split-done'),
        errorTitle: t('screens.visitors.split-error'),
      });
      if (result) void detail.reload();
      return result?.info ?? null;
    },
    [detail, id, run, t]
  );

  return { detail: detail.data, status: detail.status, pending, mutate, removeSample, split };
}
