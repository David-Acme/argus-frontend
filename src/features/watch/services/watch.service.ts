import { readWatchList, readWatchReply, WATCH_ROUTES } from '@/core/contracts/watch.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
import type { WatchConversation, WatchReply } from '@/core/types';

class WatchService {
  async list(): Promise<IServiceResponse<WatchConversation[]>> {
    const response = await httpService.get<unknown>(WATCH_ROUTES.list);
    return expectShape(response, readWatchList, 'The camera conversations');
  }

  async reply(conversationId: string, text: string): Promise<IServiceResponse<WatchReply>> {
    const response = await httpService.post<unknown>(WATCH_ROUTES.reply(conversationId), { text });
    return expectShape(response, readWatchReply, 'The visitor reply answer');
  }

  end(conversationId: string): Promise<IServiceResponse<unknown>> {
    return httpService.post<unknown>(WATCH_ROUTES.end(conversationId), {});
  }
}

export const watchService = new WatchService();
