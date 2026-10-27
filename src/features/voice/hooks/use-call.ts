import { useCallback, useEffect } from 'react';
import type { VoiceStartOptions } from '@/core/types';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';

export function useCall(options: VoiceStartOptions = {}) {
  const session = useVoiceSession();
  const { callId, purpose } = options;
  const { start, stop, setMuted } = session;

  useEffect(() => {
    start({ ...(callId ? { callId } : {}), ...(purpose ? { purpose } : {}) });
    return () => stop();
  }, [callId, purpose, start, stop]);

  const toggleMute = useCallback(() => setMuted(!session.muted), [session.muted, setMuted]);

  const retry = useCallback(() => {
    stop();
    start(purpose ? { purpose } : {});
  }, [purpose, start, stop]);

  return {
    phase: session.phase,
    muted: session.muted,
    error: session.error,
    transcript: session.transcript,
    actions: session.actions,
    liveCameraId: session.liveCameraId,
    liveCameraView: session.liveCameraView,
    callReason: session.callReason,
    responseId: session.responseId,
    waitingCall: session.waitingCall,
    closedCallId: session.closedCallId,
    closedReason: session.closedReason,
    connectedAt: session.connectedAt,
    callUrgency: session.callUrgency,
    toggleMute,
    retry,
  };
}
