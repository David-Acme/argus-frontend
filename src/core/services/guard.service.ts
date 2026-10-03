import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import type {
  GuardDecisionPage,
  GuardExpectedGuest,
  GuardExpectedGuestCreate,
  GuardFeedbackLabel,
  GuardIncident,
  GuardMode,
  GuardModeState,
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

  decisions(): Promise<IServiceResponse<GuardDecisionPage>> {
    return httpService.get<GuardDecisionPage>(`/guard/decisions?limit=${GUARD_LIST_LIMIT}`);
  }

  feedback(eventId: string, label: GuardFeedbackLabel): Promise<IServiceResponse<unknown>> {
    return httpService.post(`/guard/decisions/${encodeURIComponent(eventId)}/feedback`, { label });
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
}

export const guardService = new GuardService();
