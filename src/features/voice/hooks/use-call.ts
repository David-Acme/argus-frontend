import { useCallback, useEffect } from 'react';
import { useAvatarStore } from '@/features/voice/stores/avatar.store';
import type { AvatarState, VoicePhase } from '@/core/types';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';

const AVATAR_BY_PHASE: Readonly<Record<VoicePhase, AvatarState>> = {
  idle: 'idle',
  connecting: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  done: 'idle',
  error: 'error',
};

export function useCall() {
  const session = useVoiceSession();
  const { start, stop, setMuted, interrupt } = session;
  const setAvatarState = useAvatarStore((state) => state.setState);

  useEffect(() => {
    start();
    return () => {
      stop();
      setAvatarState('idle');
    };
  }, [start, stop, setAvatarState]);

  useEffect(() => {
    setAvatarState(AVATAR_BY_PHASE[session.phase]);
  }, [session.phase, setAvatarState]);

  const toggleMute = useCallback(() => setMuted(!session.muted), [session.muted, setMuted]);

  const retry = useCallback(() => {
    stop();
    start();
  }, [start, stop]);

  return {
    phase: session.phase,
    muted: session.muted,
    error: session.error,
    transcript: session.transcript,
    actions: session.actions,
    liveCameraId: session.liveCameraId,
    toggleMute,
    interrupt,
    retry,
  };
}
