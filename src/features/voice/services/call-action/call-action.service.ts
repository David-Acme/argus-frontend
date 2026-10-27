import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { reminderService } from '@/core/services/reminder.service';
import { CALL_ACTION_ROUTE, CALL_SNOOZE_MINUTES } from '@/features/voice/constants/call.constant';
import { callActionStatusOf } from '@/features/voice/model/call-action';
import type { CallActionRequest } from '@/features/voice/model/call-action';

class ReminderCallService {
  snooze(reminderId: number): Promise<IServiceResponse<unknown>> {
    return reminderService.snooze(String(reminderId), { minutes: CALL_SNOOZE_MINUTES });
  }

  markDone(reminderId: number): Promise<IServiceResponse<unknown>> {
    return reminderService.update(String(reminderId), { isCompleted: true });
  }

  async act(request: CallActionRequest): Promise<number> {
    return callActionStatusOf(await httpService.post(CALL_ACTION_ROUTE, request));
  }
}

export const reminderCallService = new ReminderCallService();
