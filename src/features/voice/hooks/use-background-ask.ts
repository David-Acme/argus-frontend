import { useEffect } from 'react';
import { pushService } from '@/core/services/push';
import { traceEvent } from '@/core/services/native-trace';
import { shouldAskBackground } from '@/features/voice/model/background-ask';

let askedThisRun = false;

export function useBackgroundAsk(inCall: boolean): void {
  useEffect(() => {
    if (!shouldAskBackground({ inCall, allowed: !inCall || pushService.backgroundAllowed(), asked: askedThisRun })) return;
    askedThisRun = true;
    traceEvent('voice', 'background', 'ask-permission');
    pushService.requestBackground();
  }, [inCall]);
}
