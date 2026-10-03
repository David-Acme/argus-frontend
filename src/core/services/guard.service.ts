import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import type {
  GuardCameraContext,
  GuardCameraContextUpdate,
  GuardEpisode,
  GuardEpisodeDetail,
  GuardEpisodePage,
  GuardExpectedGuest,
  GuardExpectedGuestCreate,
  GuardFeedbackLabel,
  GuardIncident,
  GuardMode,
  GuardModeState,
  GuardSite,
  GuardSitePatch,
} from '@/core/types';
import { GUARD_LIST_LIMIT } from '@/shared/constants';

class GuardService {
  mode(): Promise<IServiceResponse<GuardModeState>> {
    return httpService.get<GuardModeState>('/guard/mode');
  }

  setMode(mode: GuardMode): Promise<IServiceResponse<{ mode: GuardMode }>> {
    return httpService.post<{ mode: GuardMode }>('/guard/mode', { mode });
  }

  incidents(): Promise<IServiceResponse<GuardIncident[]>> {
    return httpService.get<GuardIncident[]>(`/guard/incidents?limit=${GUARD_LIST_LIMIT}`);
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

  site(): Promise<IServiceResponse<GuardSite>> {
    return httpService.get<GuardSite>('/guard/site');
  }

  updateSite(patch: GuardSitePatch): Promise<IServiceResponse<GuardSite>> {
    return httpService.patch<GuardSite>('/guard/site', patch);
  }

  cameras(): Promise<IServiceResponse<GuardCameraContext[]>> {
    return httpService.get<GuardCameraContext[]>('/guard/cameras');
  }

  setCamera(cameraId: number, body: GuardCameraContextUpdate): Promise<IServiceResponse<GuardCameraContext>> {
    return httpService.put<GuardCameraContext>(`/guard/cameras/${cameraId}`, body);
  }

  episodes(): Promise<IServiceResponse<GuardEpisodePage>> {
    return httpService.get<GuardEpisodePage>(`/guard/episodes?limit=${GUARD_LIST_LIMIT}`);
  }

  episode(id: number): Promise<IServiceResponse<GuardEpisodeDetail>> {
    return httpService.get<GuardEpisodeDetail>(`/guard/episodes/${id}`);
  }

  reviewEpisode(id: number, label: GuardFeedbackLabel): Promise<IServiceResponse<GuardEpisode>> {
    return httpService.post<GuardEpisode>(`/guard/episodes/${id}/review`, { label });
  }
}

export const guardService = new GuardService();
