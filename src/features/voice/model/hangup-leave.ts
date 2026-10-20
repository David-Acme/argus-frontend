export type HangupCall = {
  send(topic: string, payload: string): Promise<void>;
  leave(): Promise<void>;
};

export type ReleaseSchedule = (run: () => void, ms: number) => void;

export function boundedRelease(release: () => void, maxMs: number, schedule: ReleaseSchedule): () => void {
  let released = false;
  const once = () => {
    if (released) return;
    released = true;
    release();
  };
  schedule(once, maxMs);
  return once;
}

export async function sendHangupThenLeave(input: {
  call: HangupCall;
  flushMs: number;
  wait: (ms: number) => Promise<void>;
  onSent: (sent: boolean) => void;
  fallback: () => void;
  release: () => void;
}): Promise<void> {
  try {
    const sent = await input.call.send('argus.hangup', '{}').then(
      () => true,
      () => false,
    );
    input.onSent(sent);
    if (!sent) input.fallback();
    await input.wait(input.flushMs);
    await input.call.leave();
  } finally {
    input.release();
  }
}

export async function leaveThenRelease(input: { call: Pick<HangupCall, 'leave'>; release: () => void }): Promise<void> {
  try {
    await input.call.leave();
  } finally {
    input.release();
  }
}
