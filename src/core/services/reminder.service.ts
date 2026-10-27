import type { IReminderSnooze, IReminderUpdate, IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';

class ReminderService {
  update(id: string, body: IReminderUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/reminder/${id}`, body);
  }

  snooze(id: string, body: IReminderSnooze): Promise<IServiceResponse<unknown>> {
    return httpService.post(`/reminder/${id}/snooze`, body);
  }
}

export const reminderService = new ReminderService();
