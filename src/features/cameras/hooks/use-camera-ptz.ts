import { useCallback, useEffect, useRef, useState } from 'react';
import type { ICameraPtz } from '@/core/interfaces';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import {
  PTZ_LIMIT_NOTICE_MS,
  ptzHold,
  ptzStep,
  reachedLimit,
  type PtzDirection,
} from '@/features/cameras/model/camera-ptz';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';

export type CameraPtzControls = {
  moving: boolean;
  limit: PtzDirection | null;
  onStep: (direction: PtzDirection) => void;
  onHoldStart: (direction: PtzDirection) => void;
  onHoldEnd: () => void;
};

export function useCameraPtz(cameraId: string): CameraPtzControls {
  const { t } = useTranslation();
  const { run, pending } = useServiceAction();
  const [limit, setLimit] = useState<PtzDirection | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const held = useRef<PtzDirection | null>(null);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback(
    (direction: PtzDirection | null, body: ICameraPtz) => {
      const next = queue.current.then(async () => {
        const result = await run({
          call: () => cameraControlService.move(cameraId, body),
          errorTitle: t('screens.cameras.device-offline'),
        });
        if (!direction || !result || !reachedLimit(result.info)) return;
        if (limitTimer.current) clearTimeout(limitTimer.current);
        setLimit(direction);
        limitTimer.current = setTimeout(() => setLimit(null), PTZ_LIMIT_NOTICE_MS);
      });
      queue.current = next.catch(() => undefined);
    },
    [cameraId, run, t],
  );

  const onStep = useCallback((direction: PtzDirection) => send(direction, ptzStep(direction)), [send]);

  const onHoldStart = useCallback(
    (direction: PtzDirection) => {
      held.current = direction;
      send(direction, ptzHold(direction));
    },
    [send],
  );

  const onHoldEnd = useCallback(() => {
    if (!held.current) return;
    held.current = null;
    send(null, { stop: true });
  }, [send]);

  useEffect(
    () => () => {
      if (limitTimer.current) clearTimeout(limitTimer.current);
      if (held.current) void cameraControlService.move(cameraId, { stop: true });
    },
    [cameraId],
  );

  return { moving: pending, limit, onStep, onHoldStart, onHoldEnd };
}
