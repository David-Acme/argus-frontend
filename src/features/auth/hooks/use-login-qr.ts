import { useCallback, useEffect, useRef, useState } from 'react';
import { authService } from '@/core/services/auth.service';
import { LOGIN_POLL_MS } from '@/features/auth/constants/login.constant';
import { loginPollOutcome } from '@/features/auth/model/login-entry';
import type { LoginPhase } from '@/features/auth/model/login-screen';

export type LoginQr = {
  phase: LoginPhase;
  challengeId: string | null;
  expiresAt: number | null;
  refresh: () => Promise<void>;
  retryOwner: () => Promise<void>;
};

export function useLoginQr(active: boolean): LoginQr {
  const [phase, setPhase] = useState<LoginPhase>('loading');
  const [challenge, setChallenge] = useState<{ id: string; expiresAt: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const refresh = useCallback(async () => {
    setPhase('loading');
    const created = await authService.createDeviceLogin();
    if (!created.ok || !created.info?.challengeId) {
      setPhase('error');
      return;
    }
    setChallenge({ id: created.info.challengeId, expiresAt: created.info.expiresAt });
    setPhase('qr');
  }, []);

  const retryOwner = useCallback(async () => {
    const status = await authService.serverStatus();
    if (!status.ok || !status.info) setPhase('error');
    else if (status.info.hasOwner) await refresh();
    else setPhase('waiting-owner');
  }, [refresh]);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    void authService.serverStatus().then((status) => {
      if (!alive) return;
      if (!status.ok || !status.info) setPhase('error');
      else if (status.info.hasOwner) void refresh();
      else setPhase('waiting-owner');
    });
    return () => {
      alive = false;
      stop();
    };
  }, [active, refresh, stop]);

  useEffect(() => {
    if (phase !== 'qr' || !challenge) return;
    const tick = async () => {
      const polled = await authService.pollDeviceLogin(challenge.id);
      const outcome = polled.ok && polled.info ? loginPollOutcome(polled.info) : 'waiting';
      if (outcome === 'approved') setPhase('approved');
      else if (outcome === 'expired') setPhase('expired');
      else timer.current = setTimeout(() => void tick(), LOGIN_POLL_MS);
    };
    timer.current = setTimeout(() => void tick(), LOGIN_POLL_MS);
    return stop;
  }, [challenge, phase, stop]);

  return {
    phase,
    challengeId: challenge?.id ?? null,
    expiresAt: challenge?.expiresAt ?? null,
    refresh,
    retryOwner,
  };
}
