import { useCallback } from 'react';
import { t } from '@/core/i18n';
import { guardService } from '@/core/services/guard.service';
import type {
  MaintenanceDeclare,
  MaintenanceList,
  MaintenanceWindow,
  ResourceMatch,
  TamperAskAnswer,
} from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { runServiceAction } from '@/shared/libs/service-action';
import { replaceWindow, sortWindows } from '@/features/security/model/maintenance';

const MAINTENANCE_RESOURCES: readonly ResourceMatch[] = [{ domain: 'guard', scope: 'maintenance' }];

const loadMaintenance = () => guardService.maintenance();

export type MaintenanceControls = {
  windows: readonly MaintenanceWindow[];
  ready: boolean;
  declare: (body: MaintenanceDeclare) => Promise<boolean>;
  end: (window: MaintenanceWindow) => Promise<boolean>;
  answerView: (window: MaintenanceWindow, cameraId: number, accept: boolean) => Promise<boolean>;
};

export function useMaintenance(enabled: boolean): MaintenanceControls {
  const resource = useRemoteResource<MaintenanceList>({
    cacheKey: VIEW_CACHE_KEYS.guardMaintenance,
    load: loadMaintenance,
    enabled,
    resources: MAINTENANCE_RESOURCES,
  });
  const mutate = resource.mutate;

  const keep = useCallback(
    (next: MaintenanceWindow) =>
      mutate((previous) => ({ windows: replaceWindow(previous?.windows ?? [], next) })),
    [mutate],
  );

  const declare = useCallback(
    async (body: MaintenanceDeclare): Promise<boolean> => {
      const result = await runServiceAction({
        call: () => guardService.declareMaintenance(body),
        success: t('screens.security.maintenance.declared'),
        errorTitle: t('screens.security.maintenance.declare-failed'),
      });
      if (result?.info) keep(result.info);
      return result?.info != null;
    },
    [keep],
  );

  const end = useCallback(
    async (window: MaintenanceWindow): Promise<boolean> => {
      const result = await runServiceAction({
        call: () => guardService.endMaintenance(window.id),
        success: t('screens.security.maintenance.ended'),
        errorTitle: t('screens.security.maintenance.end-failed'),
      });
      if (result?.info) keep(result.info);
      return result?.info != null;
    },
    [keep],
  );

  const answerView = useCallback(
    async (window: MaintenanceWindow, cameraId: number, accept: boolean): Promise<boolean> => {
      const result = await runServiceAction({
        call: () => guardService.answerMaintenanceView(window.id, { cameraId, accept }),
        success: accept ? t('screens.security.maintenance.view-accepted') : t('screens.security.maintenance.view-refused'),
        errorTitle: t('screens.security.maintenance.answer-failed'),
      });
      if (result?.info) keep(result.info);
      return result?.info != null;
    },
    [keep],
  );

  return {
    windows: sortWindows(resource.data?.windows ?? []),
    ready: resource.data != null,
    declare,
    end,
    answerView,
  };
}

export async function claimTamper(incidentId: number): Promise<boolean> {
  const result = await runServiceAction({
    call: () => guardService.claimTamper(incidentId),
    success: t('screens.security.tamper.claimed'),
    errorTitle: t('screens.security.tamper.claim-failed'),
  });
  return result?.info != null;
}

export async function answerTamperAsk(askId: number, answer: TamperAskAnswer): Promise<boolean> {
  const result = await runServiceAction({
    call: () => guardService.answerTamperAsk(askId, answer),
    success: answer === 'me' ? t('screens.security.tamper.ask-me-sent') : t('screens.security.tamper.ask-no-sent'),
    errorTitle: t('screens.security.maintenance.answer-failed'),
  });
  return result?.info != null;
}

export async function answerViewCheck(maintenanceId: number, cameraId: number, accept: boolean): Promise<boolean> {
  const result = await runServiceAction({
    call: () => guardService.answerMaintenanceView(maintenanceId, { cameraId, accept }),
    success: accept ? t('screens.security.maintenance.view-accepted') : t('screens.security.maintenance.view-refused'),
    errorTitle: t('screens.security.maintenance.answer-failed'),
  });
  return result?.info != null;
}
