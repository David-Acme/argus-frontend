import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ICameraPtz, IServiceResponse } from '@/core/interfaces';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import {
  PTZ_LIMIT_NOTICE_MS,
  ptzHold,
  ptzStep,
  reachedLimit,
  type PtzDirection,
} from '@/features/cameras/model/camera-ptz';
import { createPtzHold, type PtzHold } from '@/features/cameras/model/ptz-hold';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';

export type CameraPtzControls = {
  moving: boolean;
  limit: PtzDirection | null;
  onStep: (direction: PtzDirection) => void;
  onHoldStart: (direction: PtzDirection) => void;
  onHoldEnd: () => void;
};

type MoveRequest = () => Promise<IServiceResponse<unknown> | null>;

type PtzPort = {
  send: (direction: PtzDirection | null, body: ICameraPtz) => Promise<unknown>;
  renew: (direction: PtzDirection) => Promise<unknown>;
};

export function useCameraPtz(cameraId: string, holdRenewMs: number | null): CameraPtzControls {
  const { t } = useTranslation();
  const { run, pending } = useServiceAction();
  const [limit, setLimit] = useState<PtzDirection | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const port = useRef<PtzPort | null>(null);
  const hold = useRef<PtzHold | null>(null);

  const enqueue = useCallback((direction: PtzDirection | null, request: MoveRequest) => {
    const next = queue.current.then(async () => {
      const result = await request();
      if (!direction || !result || !reachedLimit(result.info)) return;
      if (limitTimer.current) clearTimeout(limitTimer.current);
      setLimit(direction);
      limitTimer.current = setTimeout(() => setLimit(null), PTZ_LIMIT_NOTICE_MS);
    });
    queue.current = next.catch(() => undefined);
    return queue.current;
  }, []);

  const send = useCallback(
    (direction: PtzDirection | null, body: ICameraPtz) =>
      enqueue(direction, () =>
        run({
          call: () => cameraControlService.move(cameraId, body),
          errorTitle: t('screens.cameras.sight.move-failed'),
        }),
      ),
    [cameraId, enqueue, run, t],
  );

  const renew = useCallback(
    (direction: PtzDirection) =>
      enqueue(direction, async () => {
        const result = await cameraControlService.move(cameraId, ptzHold(direction));
        return result.ok ? result : null;
      }),
    [cameraId, enqueue],
  );

  useEffect(() => {
    port.current = { send, renew };
  }, [renew, send]);

  const holdOf = useCallback(() => {
    hold.current ??= createPtzHold({
      start: (direction) => port.current?.send(direction, ptzHold(direction)) ?? Promise.resolve(),
      renew: (direction) => port.current?.renew(direction) ?? Promise.resolve(),
      stop: () => {
        void port.current?.send(null, { stop: true });
      },
    });
    return hold.current;
  }, []);

  const onStep = useCallback(
    (direction: PtzDirection) => {
      void send(direction, ptzStep(direction));
    },
    [send],
  );

  const onHoldStart = useCallback(
    (direction: PtzDirection) => holdOf().begin(direction, holdRenewMs),
    [holdOf, holdRenewMs],
  );

  const onHoldEnd = useCallback(() => holdOf().release(), [holdOf]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => hold.current?.appState(state));
    return () => subscription.remove();
  }, []);

  useEffect(
    () => () => {
      if (hold.current?.dispose()) void cameraControlService.move(cameraId, { stop: true });
    },
    [cameraId],
  );

  useEffect(
    () => () => {
      if (limitTimer.current) clearTimeout(limitTimer.current);
    },
    [],
  );

  return { moving: pending, limit, onStep, onHoldStart, onHoldEnd };
}
