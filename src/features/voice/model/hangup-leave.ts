export type HangupCall = {
  send(topic: string, payload: string): Promise<void>;
  leave(): Promise<void>;
};

export async function sendHangupThenLeave(input: {
  call: HangupCall;
  flushMs: number;
  wait: (ms: number) => Promise<void>;
  onSent: (sent: boolean) => void;
  fallback: () => void;
}): Promise<void> {
  const sent = await input.call.send('argus.hangup', '{}').then(
    () => true,
    () => false,
  );
  input.onSent(sent);
  if (!sent) input.fallback();
  await input.wait(input.flushMs);
  await input.call.leave();
}
