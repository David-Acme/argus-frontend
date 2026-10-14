import { useEffect } from 'react';
import { AppState } from 'react-native';
import { pushService } from '@/core/services/push';
import { voiceService } from '@/features/voice/services/voice';

export function useCallPush(): void {
  useEffect(() => {
    const unsubscribe = pushService.onDecline((callId) => {
      void voiceService.declineCall(callId);
    });
    pushService.drainDeclines();
    const resume = AppState.addEventListener('change', (state) => {
      if (state === 'active') pushService.drainDeclines();
    });
    return () => {
      unsubscribe();
      resume.remove();
    };
  }, []);
}
