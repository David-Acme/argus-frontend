import { presenceOverviewSchema } from '@/core/contracts/presence.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type { PresenceOverview } from '@/core/types';

const PRESENCE_PATH = '/guard/presence';

class PresenceService {
  async overview(): Promise<IServiceResponse<PresenceOverview>> {
    const response = await httpService.get<unknown>(PRESENCE_PATH);
    if (!response.ok) return { ...response, info: null };
    const parsed = presenceOverviewSchema.safeParse(response.info);
    if (!parsed.success) {
      return errorResponse(response.status, 'INVALID_RESPONSE', 'The presence overview is not in the expected shape');
    }
    return { ...response, info: parsed.data };
  }
}

export const presenceService = new PresenceService();
