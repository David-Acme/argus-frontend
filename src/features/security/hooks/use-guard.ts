import { useCallback, useState } from 'react';
import { t } from '@/core/i18n';
import type { IServiceResponse } from '@/core/interfaces';
import { guardService } from '@/core/services/guard.service';
import type {
  GuardCameraContext,
  GuardCameraContextUpdate,
  GuardEpisode,
  GuardExpectedGuest,
  GuardExpectedGuestCreate,
  GuardFeedbackLabel,
  GuardMode,
  GuardSite,
  GuardSitePatch,
} from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { runServiceAction } from '@/shared/libs/service-action';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';

type OptimisticRemote<T, R> = {
  mutate: (update: (previous: T | null) => T | null) => void;
  apply: (previous: T | null) => T | null;
  call: () => Promise<IServiceResponse<R>>;
  settle: (current: T | null, info: R) => T | null;
  success?: string;
};

const loadMode = () => guardService.mode();
const loadGuests = () => guardService.expectedGuests();
const loadSite = () => guardService.site();
const loadCameras = () => guardService.cameras();
const loadEpisodes = async () => {
  const result = await guardService.episodes();
  return { ...result, info: result.info?.rows ?? null };
};

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

function replaceCamera(
  rows: GuardCameraContext[] | null,
  next: GuardCameraContext
): GuardCameraContext[] {
  const others = (rows ?? []).filter((row) => row.cameraId !== next.cameraId);
  return [...others, next].sort((left, right) => left.cameraId - right.cameraId);
}

function replaceEpisode(rows: GuardEpisode[] | null, next: GuardEpisode): GuardEpisode[] {
  return (rows ?? []).map((row) => (row.kind === next.kind && row.id === next.id ? next : row));
}

export function useGuardMode(enabled: boolean) {
  return useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardMode, load: loadMode, enabled });
}

export function useGuard(owner: boolean) {
  const mode = useGuardMode(true);
  const guests = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardGuests, load: loadGuests });
  const site = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardSite, load: loadSite, enabled: owner });
  const cameras = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.guardCameras,
    load: loadCameras,
    enabled: owner,
  });
  const episodes = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardEpisodes, load: loadEpisodes });
  const [pendingMode, setPendingMode] = useState<GuardMode | null>(null);
  const reloadMode = mode.reload;
  const reloadGuests = guests.reload;
  const mutateGuests = guests.mutate;
  const mutateSite = site.mutate;
  const mutateCameras = cameras.mutate;
  const mutateEpisodes = episodes.mutate;

  const setMode = useCallback(
    async (next: GuardMode) => {
      setPendingMode(next);
      const result = await runServiceAction({
        call: () => guardService.setMode(next),
        success: t('screens.security.mode.saved', { mode: t(`screens.security.mode.${next}`) }),
      });
      setPendingMode(null);
      if (result) await reloadMode();
    },
    [reloadMode]
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

  const updateSite = useCallback(
    async (patch: GuardSitePatch): Promise<boolean> => {
      const saved = await optimisticRemote<GuardSite, GuardSite>({
        mutate: mutateSite,
        apply: (previous) => (previous ? { ...previous, ...patch } : previous),
        call: () => guardService.updateSite(patch),
        settle: (_current, info) => info,
      });
      if (saved) await reloadMode();
      return saved;
    },
    [mutateSite, reloadMode]
  );

  const updateCamera = useCallback(
    (cameraId: number, body: GuardCameraContextUpdate): Promise<boolean> =>
      optimisticRemote<GuardCameraContext[], GuardCameraContext>({
        mutate: mutateCameras,
        apply: (previous) => replaceCamera(previous, { ...body, cameraId, updatedAt: Date.now() / 1000 }),
        call: () => guardService.setCamera(cameraId, body),
        settle: (current, info) => replaceCamera(current, info),
        success: t('screens.security.cameras.saved'),
      }),
    [mutateCameras]
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

  return {
    mode: mode.data,
    guests: guests.data ?? [],
    site: site.data,
    cameras: cameras.data ?? [],
    episodes: episodes.data ?? [],
    loadedAt: guests.loadedAt,
    failed: mode.status === 'failed',
    pendingMode,
    reload: reloadMode,
    setMode,
    addGuest,
    removeGuest,
    updateSite,
    updateCamera,
    reviewEpisode,
  };
}
