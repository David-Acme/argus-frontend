import { useCallback, useState } from 'react';
import { moduleEngine, modulesService } from '@/core/services/modules';
import type { ModuleImpact, ModuleRecord } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { runServiceAction } from '@/shared/libs/service-action';
import { toast } from '@/shared/libs/toast';

export type DisableTarget = {
  module: ModuleRecord;
  impact: ModuleImpact;
};

export function useModuleDisable() {
  const { t } = useTranslation();
  const [target, setTarget] = useState<DisableTarget | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const disableNow = useCallback(
    async (module: ModuleRecord) =>
      runServiceAction({
        call: () => moduleEngine.act(module.id, 'disable'),
        errorTitle: t('screens.modules.action-failed'),
      }),
    [t]
  );

  const start = useCallback(
    async (module: ModuleRecord) => {
      setChecking(module.id);
      const answer = await modulesService.impact(module.id, 'disable');
      setChecking(null);
      if (answer.ok && answer.info) {
        if (!answer.info.allowed) {
          toast.warning(t('screens.modules.action-failed'), t('screens.modules.impact.refused', { reason: answer.info.refusal?.message ?? '' }));
          return;
        }
        setTarget({ module, impact: answer.info });
        return;
      }
      const accepted = await confirm({
        title: t('screens.modules.confirm-disable-title', { name: module.name }),
        description: t('screens.modules.confirm-disable-description'),
        confirmLabel: t('screens.modules.actions.disable'),
        cancelLabel: t('common.cancel'),
        intent: 'warning',
      });
      if (accepted) await disableNow(module);
    },
    [disableNow, t]
  );

  const close = useCallback(() => setTarget(null), []);

  const confirmTarget = useCallback(async () => {
    if (!target) return;
    setBusy(true);
    await disableNow(target.module);
    setBusy(false);
    setTarget(null);
  }, [disableNow, target]);

  return { target, checking, busy, start, close, confirm: confirmTarget };
}
