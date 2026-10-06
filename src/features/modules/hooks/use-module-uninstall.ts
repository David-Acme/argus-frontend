import { useCallback, useRef, useState } from 'react';
import { moduleEngine, modulesService } from '@/core/services/modules';
import type { IApiError } from '@/core/interfaces';
import type { ModuleCatalog, ModuleDataOwner, ModuleImpact, ModuleRecord } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { toastServiceError } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import { askCurrentPin } from '@/features/safety';
import { impactHasEffects, reassignBody, refusalOf, type ReassignChoices } from '@/features/modules/model/module-impact';
import {
  blockMessage,
  pinStep,
  retryBody,
  uninstallBlock,
  uninstallMode,
  type UninstallMode,
} from '@/features/modules/model/module-lifecycle';

export type UninstallTarget = {
  module: ModuleRecord;
  mode: UninstallMode;
  owners: ModuleDataOwner[] | null;
  impact: ModuleImpact | null;
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

  const start = useRef<(module: ModuleRecord) => Promise<void>>(async () => undefined);

  const send = useCallback(
    async (module: ModuleRecord, keepData: boolean, reassign?: Record<string, string>) => {
      let pin: string | undefined;
      for (;;) {
        const result = await moduleEngine.act(module.id, 'uninstall', {
          keepData,
          ...(pin === undefined ? {} : { pin }),
          ...(reassign ? { reassign } : {}),
        });
        if (result.ok) {
          toast.info(
            keepData
              ? t('screens.modules.uninstall.done', { name: module.name })
              : t('screens.modules.uninstall.purge-started', { name: module.name })
          );
          return true;
        }
        if (result.errors?.code === 'MODULE_ROLES_HELD') {
          toast.warning(t('screens.modules.action-failed'), t('screens.modules.impact.roles-held'));
          void start.current(module);
          return false;
        }
        const step = pinStep(result.errors?.code);
        if (step === 'locked') {
          toast.error(t('screens.modules.action-failed'), t('screens.modules.uninstall.pin-locked'));
          return false;
        }
        if (step === 'refused') {
          refusal(module, result.errors);
          return false;
        }
        if (step === 'invalid') toast.warning(t('screens.modules.uninstall.pin-invalid'));
        const entered = await askCurrentPin();
        if (entered === null) return false;
        pin = entered;
      }
    },
    [refusal, t]
  );

  const retry = useCallback(
    async (module: ModuleRecord) => {
      const body = retryBody(module.job);
      if (body) await send(module, body.keepData);
    },
    [send]
  );

  const begin = useCallback(
    async (module: ModuleRecord) => {
      const block = uninstallBlock(catalog, module);
      if (block) {
        toast.warning(blockMessage(block, t));
        return;
      }
      setChecking(module.id);
      const erasing = module.lifecycle === 'uninstalled_data_kept';
      const impactAnswer = erasing ? null : await modulesService.impact(module.id, 'uninstall');
      const impact = impactAnswer?.ok ? impactAnswer.info : null;
      const answer = impact ? null : await modulesService.data(module.id);
      setChecking(null);
      if (impact && refusalOf(impact)) {
        toast.warning(t('screens.modules.action-failed'), t('screens.modules.impact.refused', { reason: impact.refusal?.message ?? '' }));
        return;
      }
      const owners = impact ? impact.data : answer?.ok ? answer.info : null;
      const mode = uninstallMode(module, owners);
      if (mode === 'simple' && impact && impactHasEffects(impact)) {
        setTarget({ module, mode: 'simple', owners, impact });
        return;
      }
      if (mode === 'simple' && (impact || answer?.ok)) {
        const accepted = await confirm({
          title: t('screens.modules.uninstall.title', { name: module.name }),
          description: t('screens.modules.uninstall.simple-description'),
          confirmLabel: t('screens.modules.uninstall.confirm'),
          cancelLabel: t('common.cancel'),
          intent: 'warning',
        });
        if (accepted) await send(module, true);
        return;
      }
      setTarget({ module, mode: mode === 'simple' ? 'choose' : mode, owners, impact });
    },
    [catalog, send, t]
  );

  start.current = begin;

  const close = useCallback(() => setTarget(null), []);

  const submit = useCallback(
    async (keepData: boolean, choices: ReassignChoices) => {
      if (!target) return;
      const { module, impact } = target;
      setTarget(null);
      await send(module, keepData, impact ? reassignBody(impact, choices) : undefined);
    },
    [send, target]
  );

  return { target, checking, start: begin, close, submit, retry };
}
