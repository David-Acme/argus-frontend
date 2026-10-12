export type ConnectGate = 'refuse' | 'reuse' | 'join' | 'open';

export function connectGate(input: {
  clearing: boolean;
  hasSocket: boolean;
  connecting: boolean;
}): ConnectGate {
  if (input.clearing) return 'refuse';
  if (input.hasSocket) return 'reuse';
  if (input.connecting) return 'join';
  return 'open';
}
