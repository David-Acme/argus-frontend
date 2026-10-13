import type { PtzDirection } from '@/features/cameras/model/camera-ptz';

export type PtzRenewTimers = {
  every: (tick: () => void, ms: number) => () => void;
};

export type PtzHoldInput = {
  start: (direction: PtzDirection) => Promise<unknown>;
  renew: (direction: PtzDirection) => Promise<unknown>;
  stop: () => void;
  timers?: PtzRenewTimers;
};

export type PtzHold = {
  begin: (direction: PtzDirection, renewMs: number | null) => void;
  release: () => void;
  appState: (state: string) => void;
  dispose: () => boolean;
  held: () => PtzDirection | null;
  renewing: () => boolean;
};

const intervalTimers: PtzRenewTimers = {
  every: (tick, ms) => {
    const handle = setInterval(tick, ms);
    return () => clearInterval(handle);
  },
};

export function createPtzHold({ start, renew, stop, timers = intervalTimers }: PtzHoldInput): PtzHold {
  let direction: PtzDirection | null = null;
  let cancel: (() => void) | null = null;
  let inFlight = 0;

  const disarm = () => {
    cancel?.();
    cancel = null;
  };

  const track = (sent: Promise<unknown>) => {
    inFlight += 1;
    const settle = () => {
      inFlight -= 1;
    };
    void sent.then(settle, settle);
  };

  const tick = () => {
    if (direction === null || inFlight > 0) return;
    track(renew(direction));
  };

  const release = () => {
    disarm();
    if (direction === null) return;
    direction = null;
    stop();
  };

  return {
    begin: (next, renewMs) => {
      disarm();
      direction = next;
      track(start(next));
      if (renewMs !== null) cancel = timers.every(tick, renewMs);
    },
    release,
    appState: (state) => {
      if (state !== 'active') release();
    },
    dispose: () => {
      disarm();
      const cut = direction !== null;
      direction = null;
      return cut;
    },
    held: () => direction,
    renewing: () => cancel !== null,
  };
}
