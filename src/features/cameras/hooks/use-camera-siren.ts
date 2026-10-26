import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { SirenPhase } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toastServiceError } from '@/shared/libs/service-error';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import {
  IDLE_SIREN,
  sirenReducer,
  sirenRemaining,
  sirenSounding,
} from '@/features/cameras/model/siren';

export type CameraSirenControls = {
  phase: SirenPhase;
  secondsLeft: number;
  remaining: number;
  sounding: boolean;
  failed: boolean;
  ask: () => void;
  confirm: () => void;
  cancel: () => void;
  stop: () => void;
};

const TICK_MS = 200;

export function useCameraSiren(cameraId: string): CameraSirenControls {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(sirenReducer, IDLE_SIREN);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const activating = useRef(false);

  const send = useCallback(
    async (enabled: boolean): Promise<{ ok: boolean; until: number }> => {
      const result = await cameraControlService.siren({ cameraId: Number(cameraId), enabled });
      if (!result.ok) {
        toastServiceError(result.errors, t('screens.cameras.siren-failed'));
        return { ok: false, until: 0 };
      }
      return { ok: true, until: result.info?.until ?? 0 };
    },
    [cameraId, t]
  );

  useEffect(() => {
    if (state.phase !== 'countdown' && state.phase !== 'sounding') return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'countdown') return;
    const timer = setInterval(() => dispatch({ kind: 'tick', at: Date.now() }), TICK_MS);
    return () => clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'countdown' || state.secondsLeft > 0 || activating.current) return;
    activating.current = true;
    void (async () => {
      const answer = await send(true);
      if (!answer.ok) {
        setFailed(true);
        activating.current = false;
        dispatch({ kind: 'stop' });
        return;
      }
      setFailed(false);
      dispatch({ kind: 'activated', until: answer.until });
    })();
  }, [state.phase, state.secondsLeft, send]);

  useEffect(() => {
    if (state.phase !== 'sounding' || sirenSounding(state.until, now)) return;
    dispatch({ kind: 'stop' });
  }, [state.phase, state.until, now]);

  const ask = useCallback(() => {
    setFailed(false);
    dispatch({ kind: 'ask' });
  }, []);
  const confirm = useCallback(() => dispatch({ kind: 'confirm', at: Date.now() }), []);
  const cancel = useCallback(() => {
    activating.current = false;
    dispatch({ kind: 'cancel' });
  }, []);
  const stop = useCallback(() => {
    activating.current = false;
    dispatch({ kind: 'stop' });
    void send(false);
  }, [send]);

  const sounding = state.phase === 'sounding' && sirenSounding(state.until, now);
  const remaining = useMemo(() => {
    if (state.phase === 'countdown') return state.secondsLeft;
    return sounding ? sirenRemaining(state.until, now) : 0;
  }, [state.phase, state.secondsLeft, sounding, state.until, now]);

  return {
    phase: state.phase,
    secondsLeft: state.secondsLeft,
    remaining,
    sounding,
    failed,
    ask,
    confirm,
    cancel,
    stop,
  };
}
