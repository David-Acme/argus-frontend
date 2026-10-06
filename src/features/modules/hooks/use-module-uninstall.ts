import { useCallback, useState } from 'react';
import { moduleEngine, modulesService } from '@/core/services/modules';
import type { IApiError } from '@/core/interfaces';
import type { ModuleCatalog, ModuleDataOwner, ModuleRecord, ModuleUninstall } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { toastServiceError } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import { askCurrentPin, safetyService } from '@/features/safety';
import { blockMessage, uninstallBlock, uninstallMode, type UninstallMode } from '@/features/modules/model/module-lifecycle';

export type UninstallTarget = {
  module: ModuleRecord;
  mode: UninstallMode;
  owners: ModuleDataOwner[] | null;
};

export function useModuleUninstall(catalog: ModuleCatalog | null) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<UninstallTarget | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  const refusal = useCallback(
    (module: ModuleRecord, error: IApiError | null) => {
      const block = error?.code === 'MODULE_REQUIRED_BY' ? uninstallBlock(catalog, module) : null;
      if (block) toast.error(t('screens.modules.action-failed'), blockMessage(block, t));
      else toastServiceError(error, t('screens.modules.action-failed'));
    },
    [catalog, t]
  );

  const send = useCallback(
    async (module: ModuleRecord, body: ModuleUninstall) => {
      const result = await moduleEngine.act(module.id, 'uninstall', body);
      if (!result.ok) {
        refusal(module, result.errors);
        return false;
      }
      toast.info(
        body.keepData
          ? t('screens.modules.uninstall.done', { name: module.name })
          : t('screens.modules.uninstall.purge-started', { name: module.name })
      );
      return true;
    },
    [refusal, t]
  );

  const start = useCallback(
    async (module: ModuleRecord) => {
      const block = uninstallBlock(catalog, module);
      if (block) {
        toast.warning(blockMessage(block, t));
        return;
      }
      setChecking(module.id);
      const answer = await modulesService.data(module.id);
      setChecking(null);
      const owners = answer.ok ? answer.info : null;
      const mode = uninstallMode(module, owners);
      if (mode === 'simple' && answer.ok) {
        const accepted = await confirm({
          title: t('screens.modules.uninstall.title', { name: module.name }),
          description: t('screens.modules.uninstall.simple-description'),
          confirmLabel: t('screens.modules.uninstall.confirm'),
          cancelLabel: t('common.cancel'),
          intent: 'warning',
        });
        if (accepted) await send(module, { keepData: true });
        return;
      }
      setTarget({ module, mode: mode === 'simple' ? 'choose' : mode, owners });
    },
    [catalog, send, t]
  );

  const close = useCallback(() => setTarget(null), []);

  const submit = useCallback(
    async (keepData: boolean) => {
      if (!target) return;
      const { module } = target;
      setTarget(null);
      if (keepData) {
        await send(module, { keepData: true });
        return;
      }
      let pin: string | undefined;
      if (await safetyService.disarmNeedsPin()) {
        const entered = await askCurrentPin();
        if (entered === null) return;
        pin = entered;
      }
      await send(module, pin === undefined ? { keepData: false } : { keepData: false, pin });
    },
    [send, target]
  );

  return { target, checking, start, close, submit };
}
