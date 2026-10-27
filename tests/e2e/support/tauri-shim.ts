export type ShimSeed = {
  device: string;
  secure: Record<string, string>;
  local: Record<string, string>;
};

export function installTauriShim(seed: ShimSeed): void {
  type Callback = (data: unknown) => void;
  type ShimSocket = { ws: WebSocket; channel: number; index: number };
  type Args = Record<string, unknown>;
  type ShimFile = { name: string; uri: string; filename: string; contentType: string };
  type ShimRequest = {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    files?: ShimFile[];
  };
  const scope = window as unknown as Record<string, unknown>;
  if (scope.__TAURI_INTERNALS__) return;

  const SECURE_KEY = '__e2e_secure__';
  const SEEDED_KEY = '__e2e_seeded__';
  const CUT_KEY = '__e2e_unreachable__';
  if (window.localStorage.getItem(SEEDED_KEY) !== seed.device) {
    for (const [key, value] of Object.entries(seed.local)) window.localStorage.setItem(key, value);
    window.localStorage.setItem(SECURE_KEY, JSON.stringify(seed.secure));
    window.localStorage.setItem(SEEDED_KEY, seed.device);
  }
  const readSecure = (): Record<string, string> =>
    JSON.parse(window.localStorage.getItem(SECURE_KEY) ?? '{}') as Record<string, string>;
  const writeSecure = (values: Record<string, string>): void =>
    window.localStorage.setItem(SECURE_KEY, JSON.stringify(values));

  const callbacks = new Map<number, Callback>();
  let nextCallback = 1;
  const sockets = new Map<string, ShimSocket>();
  const encoder = new TextEncoder();

  const pathOf = (url: string): string => {
    const start = url.indexOf('://');
    const rest = start < 0 ? url : url.slice(start + 3);
    const slash = rest.indexOf('/');
    return slash < 0 ? '/' : rest.slice(slash);
  };

  const hostOf = (url: string): string => {
    const start = url.indexOf('://');
    const rest = start < 0 ? url : url.slice(start + 3);
    const end = rest.search(/[/:?#]/);
    return (end < 0 ? rest : rest.slice(0, end)).toLowerCase();
  };

  const cutOff = (url: string): string | null => {
    const cuts = JSON.parse(window.localStorage.getItem(CUT_KEY) ?? '{}') as Record<string, string>;
    const host = hostOf(url);
    const cut = Object.keys(cuts).find((name) => host === name || host.endsWith(`.${name}`));
    return cut === undefined ? null : (cuts[cut] ?? null);
  };

  const probe = (args: Args): { outcome: string; address: string; fingerprint: string } => {
    const outcome = cutOff(String(args.url)) ?? 'reached';
    return { outcome, address: outcome === 'dns' ? '' : '127.0.0.1:443', fingerprint: '' };
  };

  const deliver = (socket: ShimSocket, kind: number, body: Uint8Array): void => {
    const frame = new Uint8Array(body.length + 1);
    frame[0] = kind;
    frame.set(body, 1);
    const index = socket.index;
    socket.index += 1;
    callbacks.get(socket.channel)?.({ index, message: frame.buffer });
  };

  const closeFrame = (code: number, reason: string): Uint8Array => {
    const reasonBytes = encoder.encode(reason);
    const body = new Uint8Array(4 + reasonBytes.length);
    new DataView(body.buffer).setUint32(0, code);
    body.set(reasonBytes, 4);
    return body;
  };

  const formOf = async (files: ShimFile[], body: string): Promise<FormData> => {
    const form = new FormData();
    const fields = (body ? JSON.parse(body) : {}) as Record<string, string>;
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    for (const file of files)
      form.append(file.name, await (await fetch(file.uri)).blob(), file.filename);
    return form;
  };

  const request = async (args: Args): Promise<unknown> => {
    const input = args.request as ShimRequest;
    if (cutOff(input.url) !== null)
      throw new Error('NETWORK_ERROR|the e2e harness cut this host off');
    const method = input.method.toUpperCase();
    const files = input.files ?? [];
    const sent = Object.fromEntries(
      Object.entries(input.headers ?? {}).filter(
        ([key]) => files.length === 0 || key.toLowerCase() !== 'content-type'
      )
    );
    const response = await fetch(`/__api${pathOf(input.url)}`, {
      method,
      headers: { ...sent, 'x-e2e-device': seed.device },
      body:
        method === 'GET' || method === 'HEAD'
          ? undefined
          : files.length > 0
            ? await formOf(files, input.body ?? '')
            : (input.body ?? ''),
    });
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return { status: response.status, headers, body: await response.text() };
  };

  const openSocket = (args: Args): Promise<null> => {
    const options = args.options as { socketId: string; url: string };
    if (cutOff(options.url) !== null)
      return Promise.reject(new Error('NETWORK_ERROR|the e2e harness cut this host off'));
    const channel = (args.onEvent as { id: number }).id;
    const path = pathOf(options.url);
    const query = path.includes('?') ? `&${path.slice(path.indexOf('?') + 1)}` : '';
    const ws = new WebSocket(
      `ws://${window.location.host}/__sync?device=${encodeURIComponent(seed.device)}${query}`
    );
    ws.binaryType = 'arraybuffer';
    const socket: ShimSocket = { ws, channel, index: 0 };
    return new Promise((resolve, reject) => {
      let opened = false;
      ws.onopen = () => {
        opened = true;
        sockets.set(options.socketId, socket);
        resolve(null);
        deliver(socket, 0, new Uint8Array());
      };
      ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') deliver(socket, 1, encoder.encode(event.data));
        else deliver(socket, 2, new Uint8Array(event.data as ArrayBuffer));
      };
      ws.onerror = () => {
        if (!opened) reject(new Error('NETWORK_ERROR|the e2e backend refused the socket'));
      };
      ws.onclose = (event: CloseEvent) => {
        sockets.delete(options.socketId);
        if (!opened) {
          reject(new Error('NETWORK_ERROR|the e2e backend closed the socket'));
          return;
        }
        deliver(socket, 4, closeFrame(event.code, event.reason));
      };
    });
  };

  const invoke = async (
    command: string,
    args: Args = {},
    options: { headers?: Record<string, string> } = {}
  ) => {
    switch (command) {
      case 'argus_secure_get':
        return readSecure()[String(args.key)] ?? null;
      case 'argus_secure_set': {
        const values = readSecure();
        values[String(args.key)] = String(args.value);
        writeSecure(values);
        return null;
      }
      case 'argus_secure_delete': {
        const values = readSecure();
        delete values[String(args.key)];
        writeSecure(values);
        return null;
      }
      case 'argus_request':
        return request(args);
      case 'argus_probe':
        return probe(args);
      case 'argus_socket_open':
        return openSocket(args);
      case 'argus_socket_send_text':
        sockets.get(String(args.socketId))?.ws.send(String(args.message));
        return null;
      case 'argus_socket_send_binary': {
        const socketId = options.headers?.['x-argus-socket-id'] ?? '';
        sockets.get(socketId)?.ws.send(args as unknown as ArrayBuffer);
        return null;
      }
      case 'argus_socket_close':
        sockets.get(String(args.socketId))?.ws.close(1000, String(args.reason ?? ''));
        return null;
      case 'argus_discover':
        throw new Error('DISCOVERY_NOT_FOUND|the e2e harness discovers nothing');
      default:
        return null;
    }
  };

  scope.__TAURI_INTERNALS__ = {
    invoke,
    transformCallback: (callback: Callback) => {
      const id = nextCallback;
      nextCallback += 1;
      callbacks.set(id, callback);
      return id;
    },
    unregisterCallback: (id: number) => callbacks.delete(id),
    runCallback: (id: number, data: unknown) => callbacks.get(id)?.(data),
    callbacks,
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { windowLabel: 'main', label: 'main' },
    },
    convertFileSrc: (path: string) => path,
  };
  scope.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => undefined };
}
