import { readWatchList, WATCH_ROUTES } from '@/core/contracts/watch.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type { WatchConversation } from '@/core/types';

class WatchService {
  async list(): Promise<IServiceResponse<WatchConversation[]>> {
    const response = await httpService.get<unknown>(WATCH_ROUTES.list);
    if (!response.ok) return { ...response, info: null };
    const conversations = readWatchList(response.info);
    if (conversations === null) {
      return errorResponse(response.status, 'INVALID_RESPONSE', 'The camera conversations are not in the expected shape');
    }
    return { ...response, info: conversations };
  }

  end(conversationId: string): Promise<IServiceResponse<unknown>> {
    return httpService.post<unknown>(WATCH_ROUTES.end(conversationId), {});
  }
}

export const watchService = new WatchService();
