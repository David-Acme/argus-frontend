import { useEffect } from 'react';
import { pushService } from '@/core/services/push';
import { voiceService } from '@/features/voice/services/voice';

export function useCallPush(): void {
  useEffect(
    () =>
      pushService.onDecline((callId) => {
        void voiceService.declineCall(callId);
      }),
    []
  );
}
