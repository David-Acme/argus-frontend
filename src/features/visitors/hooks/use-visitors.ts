import { useCallback } from 'react';
import type { VisitorList, VisitorSettings, VisitorSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { mergedInto, patchVisitor, withoutVisitors } from '@/features/visitors/model/visitor';
import { type VisitorUpdate, visitorService } from '@/features/visitors/services/visitor.service';

export type RenameVisitorInput = {
  visitor: VisitorSummary;
  update: VisitorUpdate;
};

export type MergeVisitorsInput = {
  target: VisitorSummary;
  sourceIds: number[];
};

const loadVisitors = () => visitorService.list();
const loadSettings = () => visitorService.settings();

export function useVisitors() {
  const { t } = useTranslation();
  const list = useRemoteResource<VisitorList>({ cacheKey: VIEW_CACHE_KEYS.visitors, load: loadVisitors });
  const settings = useRemoteResource<VisitorSettings>({
    cacheKey: VIEW_CACHE_KEYS.visitorSettings,
    load: loadSettings,
  });
  const { run, pending } = useServiceAction();
  const { mutate, reload } = list;

  const update = useCallback(
    async ({ visitor, update: change }: RenameVisitorInput) => {
      let before: VisitorList | null = null;
      const result = await run({
        call: async () => {
          mutate((previous) => {
            before = previous;
            return patchVisitor(previous, visitor.id, change);
          });
          const answer = await visitorService.update(visitor.id, change);
          if (!answer.ok) mutate(() => before);
          return answer;
        },
        errorTitle: t('screens.visitors.save-error'),
      });
      return result?.info ?? null;
    },
    [mutate, run, t]
  );

  const remove = useCallback(
    async (visitor: VisitorSummary, label: string) => {
      let before: VisitorList | null = null;
      const result = await run({
        confirm: {
          title: t('screens.visitors.delete-title', { name: label }),
          description: t('screens.visitors.delete-description'),
          confirmLabel: t('screens.visitors.delete'),
          intent: 'danger',
        },
        call: async () => {
          mutate((previous) => {
            before = previous;
            return withoutVisitors(previous, [visitor.id]);
          });
          const answer = await visitorService.remove(visitor.id);
          if (!answer.ok) mutate(() => before);
          return answer;
        },
        success: t('screens.visitors.deleted', { name: label }),
        errorTitle: t('screens.visitors.delete-error'),
      });
      return result !== null;
    },
    [mutate, run, t]
  );

  const merge = useCallback(
    async ({ target, sourceIds }: MergeVisitorsInput) => {
      let before: VisitorList | null = null;
      const result = await run({
        confirm: {
          title: t('screens.visitors.merge-title'),
          description: t('screens.visitors.merge-description'),
          confirmLabel: t('screens.visitors.merge'),
          intent: 'warning',
        },
        call: async () => {
          mutate((previous) => {
            before = previous;
            return mergedInto(previous, target, sourceIds);
          });
          const answer = await visitorService.merge(target.id, sourceIds);
          if (!answer.ok) mutate(() => before);
          return answer;
        },
        success: t('screens.visitors.merged'),
        errorTitle: t('screens.visitors.merge-error'),
      });
      if (result) void reload();
      return result?.info ?? null;
    },
    [mutate, reload, run, t]
  );

  const setRetention = useCallback(
    async (days: number) => {
      let before: VisitorSettings | null = null;
      const result = await run({
        call: async () => {
          settings.mutate((previous) => {
            before = previous;
            return previous ? { ...previous, unnamedRetentionDays: days } : previous;
          });
          const answer = await visitorService.updateSettings(days);
          if (!answer.ok) settings.mutate(() => before);
          return answer;
        },
        errorTitle: t('screens.visitors.retention-error'),
      });
      return result !== null;
    },
    [run, settings, t]
  );

  return {
    list: list.data,
    status: list.status,
    settings: settings.data,
    pending,
    reload,
    update,
    remove,
    merge,
    setRetention,
  };
}
