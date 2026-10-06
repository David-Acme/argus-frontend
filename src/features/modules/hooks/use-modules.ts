import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { moduleEngine } from '@/core/services/modules';
import type { ModuleAction, ModuleCatalog, ModuleRecord } from '@/core/types';
import { useModuleCatalog } from '@/shared/hooks/use-modules';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runServiceAction } from '@/shared/libs/service-action';

export type ModuleListStatus = 'loading' | 'ready' | 'failed' | 'unsupported';

export type ModulesState = {
  catalog: ModuleCatalog | null;
  modules: ModuleRecord[];
  status: ModuleListStatus;
  pending: string | null;
  reload: () => Promise<void>;
  run: (module: ModuleRecord, action: ModuleAction) => Promise<boolean>;
};

const statusOf = (catalog: ModuleCatalog | null, failed: boolean): ModuleListStatus => {
  if (catalog && !catalog.supported) return 'unsupported';
  if (catalog && catalog.modules.length > 0) return 'ready';
  return failed ? 'failed' : 'loading';
};

export function useModules(): ModulesState {
  const { t } = useTranslation();
  const catalog = useModuleCatalog();
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const ok = await moduleEngine.refresh();
    setFailed(!ok);
  }, []);

  const confirmFor = useCallback(
    (module: ModuleRecord, action: ModuleAction) => {
      if (action === 'disable') {
        return {
          title: t('screens.modules.confirm-disable-title', { name: module.name }),
          description: t('screens.modules.confirm-disable-description'),
          confirmLabel: t('screens.modules.actions.disable'),
          cancelLabel: t('common.cancel'),
          intent: 'warning' as const,
        };
      }
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

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return {
    catalog,
    modules: catalog?.modules ?? [],
    status: statusOf(catalog, failed),
    pending,
    reload,
    run,
  };
}
