import { useRef, useState } from 'react';
import type { IServiceResponse } from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toastServiceError } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import { reminderCallService } from '@/features/voice/services/call-action/call-action.service';
import { voiceService } from '@/features/voice/services/voice';

export type SnoozeCallInput = {
  callId: string;
  reminderId: number;
};

export type ReminderCall = {
  pending: boolean;
  snooze: (input: SnoozeCallInput) => Promise<boolean>;
  markDone: (reminderId: number) => Promise<boolean>;
};

type ReminderChange = {
  send: () => Promise<IServiceResponse<unknown>>;
  done: TranslationKey;
  failed: TranslationKey;
};

export function useReminderCall(): ReminderCall {
  const { t } = useTranslation();
  const flying = useRef(false);
  const [pending, setPending] = useState(false);

  const change = async ({ send, done, failed }: ReminderChange): Promise<boolean> => {
    if (flying.current) return false;
    flying.current = true;
    setPending(true);
    try {
      const answer = await send();
      if (!answer.ok) {
        toastServiceError(answer.errors, t(failed));
        return false;
      }
      toast.success(t(done));
      return true;
    } finally {
      flying.current = false;
      setPending(false);
    }
  };

  const snooze = async ({ callId, reminderId }: SnoozeCallInput): Promise<boolean> => {
    const snoozed = await change({
      send: () => reminderCallService.snooze(reminderId),
      done: 'screens.voice.reminder.snoozed',
      failed: 'screens.voice.reminder.snooze-failed',
    });
    if (snoozed) void voiceService.declineCall(callId);
    return snoozed;
  };

  const markDone = (reminderId: number): Promise<boolean> =>
    change({
      send: () => reminderCallService.markDone(reminderId),
      done: 'screens.voice.reminder.done',
      failed: 'screens.voice.reminder.done-failed',
    });

  return { pending, snooze, markDone };
}
