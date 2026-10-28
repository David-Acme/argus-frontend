import { presenceOverviewSchema } from '@/core/contracts/presence.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
import type { PresenceOverview } from '@/core/types';

const PRESENCE_PATH = '/guard/presence';

class PresenceService {
  async overview(): Promise<IServiceResponse<PresenceOverview>> {
    const response = await httpService.get<unknown>(PRESENCE_PATH);
    return expectShape(response, presenceOverviewSchema, 'The presence overview');
  }
}

export const presenceService = new PresenceService();
