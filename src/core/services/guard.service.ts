import { guardEnvironmentListSchema, guardEnvironmentSchema } from '@/core/contracts/http.contract';
import { environmentResponseSchema } from '@/core/contracts/response.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import type {
  GuardCameraContext,
  GuardCameraContextUpdate,
  GuardEpisode,
  GuardEpisodeDetail,
  GuardEnvironment,
  GuardEnvironmentCreate,
  GuardEnvironmentPatch,
  GuardEpisodePage,
  GuardExpectedGuest,
  GuardExpectedGuestCreate,
  GuardFeedbackLabel,
  GuardMode,
  RemotePage,
  EnvironmentResponseConfig,
  EnvironmentResponseUpdate,
} from '@/core/types';
import { GUARD_EPISODES_ALL_SCOPE, GUARD_LIST_LIMIT, VIEW_CACHE_KEYS } from '@/shared/constants';
import { RemoteFeed } from './paging';

function checked<T>(result: IServiceResponse<unknown>, parse: (info: unknown) => T | null): IServiceResponse<T> {
  if (!result.ok) return { status: result.status, ok: false, info: null, errors: result.errors };
  const info = parse(result.info);
  if (info === null) {
    return {
      status: result.status,
      ok: false,
      info: null,
      errors: { code: 'INVALID_RESPONSE', message: 'The guard answered an unexpected shape' },
    };
  }
  return { status: result.status, ok: true, info, errors: null };
}

const environmentList = (info: unknown): GuardEnvironment[] | null => {
  const parsed = guardEnvironmentListSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};

const environmentOne = (info: unknown): GuardEnvironment | null => {
  const parsed = guardEnvironmentSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};

const responseConfig = (info: unknown): EnvironmentResponseConfig | null => {
  const parsed = environmentResponseSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};

class GuardService {
  async response(environmentId: number): Promise<IServiceResponse<EnvironmentResponseConfig>> {
    return checked(await httpService.get<unknown>(`/guard/environments/${environmentId}/response`), responseConfig);
  }

  async setResponse(
    environmentId: number,
    body: EnvironmentResponseUpdate
  ): Promise<IServiceResponse<EnvironmentResponseConfig>> {
    return checked(
      await httpService.put<unknown>(`/guard/environments/${environmentId}/response`, body),
      responseConfig
    );
  }

  async setDuty(environmentId: number, onDuty: boolean): Promise<IServiceResponse<EnvironmentResponseConfig>> {
    return checked(
      await httpService.post<unknown>(`/guard/environments/${environmentId}/duty`, { onDuty }),
      responseConfig
    );
  }

  async environments(): Promise<IServiceResponse<GuardEnvironment[]>> {
    return checked(await httpService.get<unknown>('/guard/environments'), environmentList);
  }

  async createEnvironment(body: GuardEnvironmentCreate): Promise<IServiceResponse<GuardEnvironment>> {
    return checked(await httpService.post<unknown>('/guard/environments', body), environmentOne);
  }

  async updateEnvironment(id: number, patch: GuardEnvironmentPatch): Promise<IServiceResponse<GuardEnvironment>> {
    return checked(await httpService.patch<unknown>(`/guard/environments/${id}`, patch), environmentOne);
  }

  async removeEnvironment(id: number): Promise<IServiceResponse<GuardEnvironment[]>> {
    return checked(await httpService.delete<unknown>(`/guard/environments/${id}`), environmentList);
  }

  async setMode(mode: GuardMode, environmentId?: number, pin?: string): Promise<IServiceResponse<GuardEnvironment[]>> {
    const body = {
      mode,
      ...(environmentId === undefined ? {} : { environmentId }),
      ...(pin === undefined ? {} : { pin }),
    };
    return checked(await httpService.post<unknown>('/guard/mode', body), environmentList);
  }

  expectedGuests(): Promise<IServiceResponse<GuardExpectedGuest[]>> {
    return httpService.get<GuardExpectedGuest[]>('/guard/expected-guests');
  }

  addExpectedGuest(body: GuardExpectedGuestCreate): Promise<IServiceResponse<{ id: number }>> {
    return httpService.post<{ id: number }>('/guard/expected-guests', body);
  }

  removeExpectedGuest(id: number): Promise<IServiceResponse<{ removed: boolean }>> {
    return httpService.delete<{ removed: boolean }>(`/guard/expected-guests?id=${id}`);
  }

  cameras(): Promise<IServiceResponse<GuardCameraContext[]>> {
    return httpService.get<GuardCameraContext[]>('/guard/cameras');
  }

  setCamera(cameraId: number, body: GuardCameraContextUpdate): Promise<IServiceResponse<GuardCameraContext>> {
    return httpService.put<GuardCameraContext>(`/guard/cameras/${cameraId}`, body);
  }

  async episodePage(
    scope: string,
    before: number | null,
  ): Promise<IServiceResponse<RemotePage<GuardEpisode, number>>> {
    const environment = scope === GUARD_EPISODES_ALL_SCOPE ? '' : `&environmentId=${scope}`;
    const cursor = before === null ? '' : `&before=${before + 1}`;
    const result = await httpService.get<GuardEpisodePage>(
      `/guard/episodes?limit=${GUARD_LIST_LIMIT}${environment}${cursor}`,
    );
    if (!result.ok || !result.info) return { ...result, info: null };
    return { ...result, info: { rows: result.info.rows, next: result.info.nextBefore } };
  }

  episode(id: number): Promise<IServiceResponse<GuardEpisodeDetail>> {
    return httpService.get<GuardEpisodeDetail>(`/guard/episodes/${id}`);
  }

  reviewEpisode(id: number, label: GuardFeedbackLabel): Promise<IServiceResponse<GuardEpisode>> {
    return httpService.post<GuardEpisode>(`/guard/episodes/${id}/review`, { label });
  }

  retainEpisode(id: number, retain: boolean): Promise<IServiceResponse<GuardEpisode>> {
    return httpService.post<GuardEpisode>(`/guard/episodes/${id}/retain`, { retain });
  }
}

export const guardService = new GuardService();

export const guardEpisodeKey = (episode: Pick<GuardEpisode, 'kind' | 'id'>): string =>
  `${episode.kind}-${episode.id}`;

export const guardEpisodeFeed = new RemoteFeed<GuardEpisode, number>({
  key: VIEW_CACHE_KEYS.guardEpisodes,
  keyOf: guardEpisodeKey,
  compare: (left, right) =>
    right.lastSeen - left.lastSeen || guardEpisodeKey(left).localeCompare(guardEpisodeKey(right)),
  fetch: (scope, before) => guardService.episodePage(scope, before),
  pinned: [GUARD_EPISODES_ALL_SCOPE],
});
