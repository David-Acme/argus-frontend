export type CallIpcSeed = {
  failures: Record<string, string>;
};

export type CallIpcCall = {
  command: string;
  args: Record<string, unknown>;
};

export function installCallIpc(seed: CallIpcSeed): void {
  type Callback = (payload: unknown) => void;
  const scope = window as unknown as Record<string, unknown>;
  const callbacks = new Map<number, Callback>();
  const listeners = new Map<string, number[]>();
  const calls: CallIpcCall[] = [];
  let nextId = 1;

  const emit = (event: string): void => {
    for (const id of listeners.get(event) ?? []) {
      callbacks.get(id)?.({ event, id: 0, payload: null });
    }
  };

  scope.__TAURI_INTERNALS__ = {
    transformCallback(callback?: Callback): number {
      const id = nextId;
      nextId += 1;
      if (callback) callbacks.set(id, callback);
      return id;
    },
    invoke(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
      calls.push({ command, args });
      if (command === 'plugin:event|listen') {
        const event = String(args.event);
        listeners.set(event, [...(listeners.get(event) ?? []), Number(args.handler)]);
        return Promise.resolve(nextId);
      }
      const failure = seed.failures[command];
      if (failure !== undefined) return Promise.reject(new Error(failure));
      return Promise.resolve(null);
    },
  };
  scope.__argusCallIpc = {
    calls: () => calls.filter((call) => call.command !== 'plugin:event|listen'),
    emit,
  };
}
