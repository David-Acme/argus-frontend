import { useCallback, useState } from 'react';
import { moduleEngine } from '@/core/services/modules';
import type { ModuleAction, ModuleCatalog, ModuleRecord } from '@/core/types';
import { CONTEXT_WAIT_MS } from '@/shared/constants';
import { useExpiry } from '@/shared/hooks/use-expiry';
import { useModuleCatalog } from '@/features/modules/hooks/use-module-catalog';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runServiceAction } from '@/shared/libs/service-action';

export type ModuleListStatus = 'loading' | 'ready' | 'waiting';

export type ModulesState = {
  catalog: ModuleCatalog | null;
  modules: ModuleRecord[];
  status: ModuleListStatus;
  pending: string | null;
  run: (module: ModuleRecord, action: ModuleAction) => Promise<boolean>;
};

const statusOf = (catalog: ModuleCatalog | null, waitedOut: boolean): ModuleListStatus => {
  if (catalog && catalog.modules.length > 0) return 'ready';
  return waitedOut ? 'waiting' : 'loading';
};

export function useModules(): ModulesState {
  const { t } = useTranslation();
  const catalog = useModuleCatalog();
  const [pending, setPending] = useState<string | null>(null);
  const waitedOut = useExpiry(catalog === null || catalog.modules.length === 0, CONTEXT_WAIT_MS);

  const confirmFor = useCallback(
    (module: ModuleRecord, action: ModuleAction) => {
      if (action === 'cancel') {
        return {
          title: t('screens.modules.confirm-cancel-title', { name: module.name }),
          description: t('screens.modules.confirm-cancel-description'),
          confirmLabel: t('screens.modules.actions.cancel'),
          cancelLabel: t('screens.modules.keep-installing'),
          intent: 'warning' as const,
        };
      }
      return undefined;
    },
    [t]
  );

  const run = useCallback(
    async (module: ModuleRecord, action: ModuleAction) => {
      const key = `${module.id}:${action}`;
      const result = await runServiceAction({
        confirm: confirmFor(module, action),
        call: () => {
          setPending(key);
          return moduleEngine.act(module.id, action);
        },
        errorTitle: t('screens.modules.action-failed'),
      });
      setPending((current) => (current === key ? null : current));
      return result !== null;
    },
    [confirmFor, t]
  );

  return {
    catalog,
    modules: catalog?.modules ?? [],
    status: statusOf(catalog, waitedOut),
    pending,
    run,
  };
}
