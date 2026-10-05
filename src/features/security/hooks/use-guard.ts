import { useCallback, useMemo, useState } from 'react';
import { t } from '@/core/i18n';
import type { ICameraCacheRow, IServiceResponse } from '@/core/interfaces';
import { guardEpisodeFeed, guardService } from '@/core/services/guard.service';
import { useAuthStore } from '@/core/stores';
import type {
  CameraEnvironmentBadge,
  GuardCameraContext,
  GuardCameraContextUpdate,
  GuardEnvironment,
  GuardEnvironmentCreate,
  GuardEnvironmentPatch,
  GuardEpisode,
  GuardExpectedGuest,
  GuardExpectedGuestCreate,
  GuardFeedbackLabel,
  GuardMode,
} from '@/core/types';
import { GUARD_EPISODES_ALL_SCOPE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useInfiniteList, useRemoteFeed } from '@/shared/hooks/use-infinite-list';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { runServiceAction } from '@/shared/libs/service-action';
import { EPISODE_MARKED_RETENTION_DAYS } from '@/features/security/constants';
import { cameraEnvironmentIndex, withCameraIn, withMode } from '@/features/security/model/environments';
import { askDisarmPin, safetyService } from '@/features/safety';

type OptimisticRemote<T, R> = {
  mutate: (update: (previous: T | null) => T | null) => void;
  apply: (previous: T | null) => T | null;
  call: () => Promise<IServiceResponse<R>>;
  settle: (current: T | null, info: R) => T | null;
  success?: string;
};

export type PendingMode = { mode: GuardMode; environmentId: number | null };

const EPISODE_END_AFTER = 8;

const loadEnvironments = () => guardService.environments();
const loadGuests = () => guardService.expectedGuests();
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

function replaceEpisode(rows: GuardEpisode[] | null, next: GuardEpisode): GuardEpisode[] {
  return (rows ?? []).map((row) => (row.kind === next.kind && row.id === next.id ? next : row));
}

function replaceEnvironment(rows: GuardEnvironment[] | null, next: GuardEnvironment): GuardEnvironment[] {
  const list = rows ?? [];
  return list.some((row) => row.id === next.id)
    ? list.map((row) => (row.id === next.id ? next : row))
    : [...list, next];
}

export function useGuardEnvironments(enabled: boolean) {
  return useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardEnvironments, load: loadEnvironments, enabled });
}

export function useCameraEnvironmentIndex(): ReadonlyMap<string, CameraEnvironmentBadge> {
  const role = useAuthStore((state) => state.user?.role);
  const environments = useGuardEnvironments(guardAccessForRole(role ?? 'guest').view).data;
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

export function useGuard(owner: boolean, environmentId?: number) {
  const placement = useCameraPlacement(owner);
  const environments = placement.environments;
  const guests = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardGuests, load: loadGuests });
  const episodes = useRemoteFeed(
    guardEpisodeFeed,
    environmentId === undefined ? GUARD_EPISODES_ALL_SCOPE : String(environmentId)
  );
  const episodePaging = useInfiniteList({
    count: episodes.rows.length,
    hasMore: episodes.hasMore,
    loadMore: episodes.loadMore,
    endAfter: EPISODE_END_AFTER,
  });
  const [pendingMode, setPendingMode] = useState<PendingMode | null>(null);
  const reloadEnvironments = environments.reload;
  const reloadGuests = guests.reload;
  const reloadCameras = placement.reloadContexts;
  const mutateEnvironments = environments.mutate;
  const mutateGuests = guests.mutate;
  const mutateFeed = episodes.mutate;
  const mutateEpisodes = useCallback(
    (update: (previous: GuardEpisode[] | null) => GuardEpisode[] | null) =>
      mutateFeed((rows) => update([...rows]) ?? []),
    [mutateFeed]
  );

  const setMode = useCallback(
    async (mode: GuardMode, target?: GuardEnvironment): Promise<boolean> => {
      let pin: string | undefined;
      if (mode === 'home' && (await safetyService.disarmNeedsPin())) {
        const entered = await askDisarmPin();
        if (entered === null) return false;
        pin = entered;
      }
      setPendingMode({ mode, environmentId: target?.id ?? null });
      const label = t(`screens.security.mode.${mode}`);
      const saved = await optimisticRemote<GuardEnvironment[], GuardEnvironment[]>({
        mutate: mutateEnvironments,
        apply: (previous) => (previous ? withMode(previous, mode, target?.id) : previous),
        call: () => guardService.setMode(mode, target?.id, pin),
        settle: (_current, info) => info,
        success: target
          ? t('screens.security.environments.mode-saved', { name: target.name, mode: label })
          : t('screens.security.environments.mode-saved-all', { mode: label }),
      });
      setPendingMode(null);
      return saved;
    },
    [mutateEnvironments]
  );

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

  const addGuest = useCallback(
    async (body: GuardExpectedGuestCreate): Promise<boolean> => {
      const result = await runServiceAction({
        call: () => guardService.addExpectedGuest(body),
        success: t('screens.security.guests.saved'),
      });
      if (result) await reloadGuests();
      return result !== null;
    },
    [reloadGuests]
  );

  const removeGuest = useCallback(
    async (guest: GuardExpectedGuest) => {
      const result = await runServiceAction({
        confirm: {
          title: t('screens.security.guests.remove-title'),
          description: t('screens.security.guests.remove-description', { name: guest.description }),
          confirmLabel: t('screens.security.guests.remove'),
          intent: 'danger',
        },
        call: () => guardService.removeExpectedGuest(guest.id),
        success: t('screens.security.guests.removed'),
      });
      if (result) mutateGuests((previous) => (previous ?? []).filter((item) => item.id !== guest.id));
    },
    [mutateGuests]
  );

  const reviewEpisode = useCallback(
    (episode: GuardEpisode, label: GuardFeedbackLabel): Promise<boolean> =>
      optimisticRemote<GuardEpisode[], GuardEpisode>({
        mutate: mutateEpisodes,
        apply: (previous) =>
          replaceEpisode(previous, { ...episode, reviewLabel: label, reviewedAt: Date.now() / 1000 }),
        call: () => guardService.reviewEpisode(episode.id, label),
        settle: (current, info) => replaceEpisode(current, info),
        success: t('screens.security.episodes.review-saved'),
      }),
    [mutateEpisodes]
  );

  const retainEpisode = useCallback(
    (episode: GuardEpisode, retain: boolean): Promise<boolean> =>
      optimisticRemote<GuardEpisode[], GuardEpisode>({
        mutate: mutateEpisodes,
        apply: (previous) =>
          replaceEpisode(previous, {
            ...episode,
            retainUntil: retain ? episode.firstSeen + EPISODE_MARKED_RETENTION_DAYS * 86400 : 0,
          }),
        call: () => guardService.retainEpisode(episode.id, retain),
        settle: (current, info) => replaceEpisode(current, info),
        success: t(retain ? 'screens.security.episodes.retain-saved' : 'screens.security.episodes.retain-released'),
      }),
    [mutateEpisodes]
  );

  return {
    environments: environments.data ?? [],
    environmentsReady: environments.data != null,
    guests: guests.data ?? [],
    cameras: placement.contexts,
    episodes: episodes.rows,
    episodePaging,
    loadedAt: guests.loadedAt,
    failed: environments.status === 'failed',
    pendingMode,
    reload: reloadEnvironments,
    setMode,
    createEnvironment,
    updateEnvironment,
    removeEnvironment,
    addGuest,
    removeGuest,
    updateCamera: placement.updateCamera,
    reviewEpisode,
    retainEpisode,
  };
}
