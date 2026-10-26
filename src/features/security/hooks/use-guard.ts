import { useCallback, useMemo } from 'react';
import { t } from '@/core/i18n';
import type { ICameraCacheRow, IServiceResponse } from '@/core/interfaces';
import { guardService } from '@/core/services/guard.service';
import type {
  CameraEnvironmentBadge,
  GuardCameraContext,
  GuardCameraContextUpdate,
  GuardEnvironment,
  GuardEnvironmentCreate,
  GuardEnvironmentPatch,
  GuardMode,
  ResourceMatch,
} from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { runServiceAction } from '@/shared/libs/service-action';
import {
  cameraEnvironmentIndex,
  headlineMode,
  withCameraIn,
} from '@/features/security/model/environments';
import { useExpectedGuests } from '@/features/security/hooks/use-expected-guests';
import { useGuardMode } from '@/features/security/hooks/use-guard-mode';

type OptimisticRemote<T, R> = {
  mutate: (update: (previous: T | null) => T | null) => void;
  apply: (previous: T | null) => T | null;
  call: () => Promise<IServiceResponse<R>>;
  settle: (current: T | null, info: R) => T | null;
  success?: string;
};

const GUARD_ENVIRONMENTS: readonly ResourceMatch[] = [
  { domain: 'guard', scope: 'environments' },
  { domain: 'camera', scope: 'overview' },
];

const loadEnvironments = () => guardService.environments();
const loadCameras = () => guardService.cameras();

async function optimisticRemote<T, R>(action: OptimisticRemote<T, R>): Promise<boolean> {
  let snapshot: T | null = null;
  action.mutate((previous) => {
    snapshot = previous;
    return action.apply(previous);
  });
  const result = await runServiceAction({ call: action.call, success: action.success });
  if (!result || result.info == null) {
    action.mutate(() => snapshot);
    return false;
  }
  const info = result.info;
  action.mutate((current) => action.settle(current, info));
  return true;
}

function replaceCamera(rows: GuardCameraContext[] | null, next: GuardCameraContext): GuardCameraContext[] {
  const others = (rows ?? []).filter((row) => row.cameraId !== next.cameraId);
  return [...others, next].sort((left, right) => left.cameraId - right.cameraId);
}

function replaceEnvironment(rows: GuardEnvironment[] | null, next: GuardEnvironment): GuardEnvironment[] {
  const list = rows ?? [];
  return list.some((row) => row.id === next.id)
    ? list.map((row) => (row.id === next.id ? next : row))
    : [...list, next];
}

export function useGuardEnvironments(enabled: boolean) {
  return useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.guardEnvironments,
    load: loadEnvironments,
    enabled,
    resources: GUARD_ENVIRONMENTS,
  });
}

export function useGuardHeadline(): GuardMode | null {
  const { guard } = useCapabilities();
  const environments = useGuardEnvironments(guard.view).data;
  return guard.view ? headlineMode(environments ?? []) : null;
}

export function useCameraEnvironmentIndex(): ReadonlyMap<string, CameraEnvironmentBadge> {
  const { guard } = useCapabilities();
  const environments = useGuardEnvironments(guard.view).data;
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  return useMemo(
    () =>
      cameraEnvironmentIndex(
        environments ?? [],
        cameras.map((camera) => camera.id)
      ),
    [environments, cameras]
  );
}

export function useCameraPlacement(owner: boolean, enabled = true) {
  const environments = useGuardEnvironments(enabled);
  const cameras = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.guardCameras,
    load: loadCameras,
    enabled: owner && enabled,
    resources: GUARD_ENVIRONMENTS,
  });
  const reloadEnvironments = environments.reload;
  const mutateCameras = cameras.mutate;
  const mutateEnvironments = environments.mutate;

  const updateCamera = useCallback(
    async (cameraId: number, body: GuardCameraContextUpdate): Promise<boolean> => {
      const target = body.environmentId;
      let before: GuardEnvironment[] | null = null;
      if (target !== undefined) {
        mutateEnvironments((previous) => {
          before = previous;
          return previous ? withCameraIn(previous, cameraId, target) : previous;
        });
      }
      const saved = await optimisticRemote<GuardCameraContext[], GuardCameraContext>({
        mutate: mutateCameras,
        apply: (previous) =>
          replaceCamera(previous, {
            ...body,
            cameraId,
            environmentId:
              target ?? previous?.find((row) => row.cameraId === cameraId)?.environmentId ?? 0,
            updatedAt: Date.now() / 1000,
          }),
        call: () => guardService.setCamera(cameraId, body),
        settle: (current, info) => replaceCamera(current, info),
        success: t('screens.security.cameras.saved'),
      });
      if (!saved && target !== undefined) mutateEnvironments(() => before);
      if (saved && target !== undefined) void reloadEnvironments();
      return saved;
    },
    [mutateCameras, mutateEnvironments, reloadEnvironments]
  );

  return {
    environments,
    contexts: cameras.data ?? [],
    reloadContexts: cameras.reload,
    updateCamera,
  };
}

export function useGuard(owner: boolean) {
  const placement = useCameraPlacement(owner);
  const environments = placement.environments;
  const guests = useExpectedGuests();
  const mode = useGuardMode(environments);
  const reloadEnvironments = environments.reload;
  const reloadGuests = guests.reload;
  const reloadCameras = placement.reloadContexts;
  const mutateEnvironments = environments.mutate;

  const createEnvironment = useCallback(
    async (body: GuardEnvironmentCreate): Promise<GuardEnvironment | null> => {
      const result = await runServiceAction({
        call: () => guardService.createEnvironment(body),
        success: t('screens.security.environments.created', { name: body.name }),
      });
      const created = result?.info ?? null;
      if (created) mutateEnvironments((previous) => replaceEnvironment(previous, created));
      return created;
    },
    [mutateEnvironments]
  );

  const updateEnvironment = useCallback(
    (environment: GuardEnvironment, patch: GuardEnvironmentPatch): Promise<boolean> =>
      optimisticRemote<GuardEnvironment[], GuardEnvironment>({
        mutate: mutateEnvironments,
        apply: (previous) => replaceEnvironment(previous, { ...environment, ...patch }),
        call: () => guardService.updateEnvironment(environment.id, patch),
        settle: (current, info) => replaceEnvironment(current, info),
      }),
    [mutateEnvironments]
  );

  const removeEnvironment = useCallback(
    async (environment: GuardEnvironment): Promise<boolean> => {
      const result = await runServiceAction({
        confirm: {
          title: t('screens.security.environments.remove-title', { name: environment.name }),
          description: t('screens.security.environments.remove-description'),
          confirmLabel: t('screens.security.environments.remove'),
          intent: 'danger',
        },
        call: () => guardService.removeEnvironment(environment.id),
        success: t('screens.security.environments.removed', { name: environment.name }),
      });
      if (!result?.info) return false;
      const remaining = result.info;
      mutateEnvironments(() => remaining);
      void reloadCameras();
      void reloadGuests();
      return true;
    },
    [mutateEnvironments, reloadCameras, reloadGuests]
  );

  return {
    environments: environments.data ?? [],
    environmentsReady: environments.data != null,
    guests: guests.list,
    cameras: placement.contexts,
    loadedAt: guests.loadedAt,
    failed: environments.status === 'failed',
    pendingMode: mode.pendingMode,
    reload: reloadEnvironments,
    setMode: mode.setMode,
    createEnvironment,
    updateEnvironment,
    removeEnvironment,
    addGuest: guests.add,
    removeGuest: guests.remove,
    updateCamera: placement.updateCamera,
  };
}
