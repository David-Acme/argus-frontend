import type { IArgusSocket } from '@/core/interfaces';

type SocketEventName = 'open' | 'message' | 'error' | 'close';
type SocketEvent = {
  type: SocketEventName;
  data?: unknown;
  code?: number;
  reason?: string;
  wasClean?: boolean;
  message?: string;
};
type SocketListener = (event: SocketEvent) => void;
type ListenerOptions = { once?: boolean } | boolean;
type OpenSocket = (url: string) => Promise<IArgusSocket>;
type WebSocketClass = new (url: string, protocols?: string | string[]) => unknown;

const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;
const ABNORMAL_CLOSE = 1006;

const pinnedOrigins = new Set<string>();

function originOf(url: string): string | null {
  const match = /^(wss?:\/\/[^/?#]+)/i.exec(url);
  return match?.[1]?.toLowerCase() ?? null;
}

export function pinSocketOrigin(url: string): () => void {
  const origin = originOf(url);
  if (!origin) return () => undefined;
  pinnedOrigins.add(origin);
  return () => {
    pinnedOrigins.delete(origin);
  };
}

export function isPinnedSocketUrl(url: string): boolean {
  const origin = originOf(url);
  return origin !== null && pinnedOrigins.has(origin);
}

function toArrayBuffer(data: unknown): ArrayBuffer | null {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    return copy.buffer;
  }
  return null;
}

export class PinnedWebSocket {
  static readonly CONNECTING = CONNECTING;
  static readonly OPEN = OPEN;
  static readonly CLOSING = CLOSING;
  static readonly CLOSED = CLOSED;

  readonly CONNECTING = CONNECTING;
  readonly OPEN = OPEN;
  readonly CLOSING = CLOSING;
  readonly CLOSED = CLOSED;
  readonly url: string;
  readonly protocol = '';
  readonly extensions = '';
  binaryType: 'arraybuffer' | 'blob' = 'arraybuffer';
  readyState = CONNECTING;
  bufferedAmount = 0;
  onopen: SocketListener | null = null;
  onmessage: SocketListener | null = null;
  onerror: SocketListener | null = null;
  onclose: SocketListener | null = null;
  private socket: IArgusSocket | null = null;
  private listeners = new Map<SocketEventName, Set<{ listener: SocketListener; once: boolean }>>();
  private closeRequested: { code: number; reason: string } | null = null;

  constructor(url: string, open: OpenSocket) {
    this.url = url;
    open(url).then(
      (socket) => this.attach(socket),
      (error: unknown) =>
        this.fail(
          error instanceof Error
            ? error.message
            : String((error as { message?: unknown })?.message ?? error)
        )
    );
  }

  addEventListener(
    type: SocketEventName,
    listener: SocketListener,
    options?: ListenerOptions
  ): void {
    const once = typeof options === 'object' && options?.once === true;
    const set = this.listeners.get(type) ?? new Set();
    set.add({ listener, once });
    this.listeners.set(type, set);
  }

  removeEventListener(type: SocketEventName, listener: SocketListener): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const entry of set) if (entry.listener === listener) set.delete(entry);
  }

  send(data: unknown): void {
    if (this.readyState !== OPEN || !this.socket)
      throw new Error('INVALID_STATE|The socket is not open');
    if (typeof data === 'string') {
      this.socket.sendText(data);
      return;
    }
    const buffer = toArrayBuffer(data);
    if (!buffer) throw new Error('INVALID_DATA|Unsupported socket payload');
    this.socket.sendBinary(buffer);
  }

  close(code = 1000, reason = ''): void {
    if (this.readyState === CLOSING || this.readyState === CLOSED) return;
    this.readyState = CLOSING;
    if (!this.socket) {
      this.closeRequested = { code, reason };
      return;
    }
    this.socket.close(code, reason);
  }

  private attach(socket: IArgusSocket): void {
    this.socket = socket;
    socket.onOpen = () => {
      if (this.closeRequested) {
        socket.close(this.closeRequested.code, this.closeRequested.reason);
        return;
      }
      this.readyState = OPEN;
      this.dispatch({ type: 'open' });
    };
    socket.onMessage = (message, data) => {
      if (this.readyState !== OPEN) return;
      this.dispatch({ type: 'message', data: data ?? message ?? '' });
    };
    socket.onError = (code, message) => {
      this.dispatch({ type: 'error', message: `${code}|${message}` });
    };
    socket.onClose = (code, reason) => this.finish(code, reason);
  }

  private fail(message: string): void {
    this.dispatch({ type: 'error', message });
    this.finish(ABNORMAL_CLOSE, message);
  }

  private finish(code: number, reason: string): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.socket = null;
    this.dispatch({ type: 'close', code, reason, wasClean: code === 1000 });
  }

  private dispatch(event: SocketEvent): void {
    const handler = {
      open: this.onopen,
      message: this.onmessage,
      error: this.onerror,
      close: this.onclose,
    }[event.type];
    handler?.(event);
    const set = this.listeners.get(event.type);
    if (!set) return;
    for (const entry of [...set]) {
      if (entry.once) set.delete(entry);
      entry.listener(event);
    }
  }
}

export function routedWebSocket(original: WebSocketClass, open: OpenSocket): WebSocketClass {
  class RoutedWebSocket {
    static readonly CONNECTING = CONNECTING;
    static readonly OPEN = OPEN;
    static readonly CLOSING = CLOSING;
    static readonly CLOSED = CLOSED;

    constructor(url: string, protocols?: string | string[]) {
      if (isPinnedSocketUrl(url)) return new PinnedWebSocket(url, open);
      return new original(url, protocols) as RoutedWebSocket;
    }
  }
  return RoutedWebSocket;
}
