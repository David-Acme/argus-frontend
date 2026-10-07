import { describe, expect, test } from 'bun:test';
import type { IArgusSocket } from '@/core/interfaces';
import {
  PinnedWebSocket,
  isPinnedSocketUrl,
  pinSocketOrigin,
  routedWebSocket,
} from '@/features/voice/services/rtc/pinned-websocket';

class FakeSocket implements IArgusSocket {
  sent: (string | ArrayBuffer)[] = [];
  closed: { code?: number; reason?: string } | null = null;
  onOpen: (() => void) | null = null;
  onMessage: ((message: string | null, data: ArrayBuffer | null) => void) | null = null;
  onError: ((code: string, message: string) => void) | null = null;
  onClose: ((code: number, reason: string) => void) | null = null;
  sendText(message: string): void {
    this.sent.push(message);
  }
  sendBinary(data: ArrayBuffer): void {
    this.sent.push(data);
  }
  close(code?: number, reason?: string): void {
    this.closed = { code, reason };
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('pinned websocket', () => {
  test('only pinned origins are routed, and unpinning forgets them', () => {
    const unpin = pinSocketOrigin('wss://argus.local:7046');
    expect(isPinnedSocketUrl('wss://argus.local:7046/rtc/v1?access_token=x')).toBe(true);
    expect(isPinnedSocketUrl('wss://argus.local:7047/rtc')).toBe(false);
    expect(isPinnedSocketUrl('ws://localhost:8081/hot')).toBe(false);
    unpin();
    expect(isPinnedSocketUrl('wss://argus.local:7046/rtc')).toBe(false);
  });

  test('the routed class sends other URLs to the original WebSocket', () => {
    class Original {
      constructor(readonly url: string) {}
    }
    const Routed = routedWebSocket(Original, async () => new FakeSocket());
    const unpin = pinSocketOrigin('wss://argus.local:7046');
    expect(new Routed('ws://localhost:8081')).toBeInstanceOf(Original);
    expect(new Routed('wss://argus.local:7046/rtc')).toBeInstanceOf(PinnedWebSocket);
    expect((Routed as unknown as { CLOSED: number }).CLOSED).toBe(3);
    unpin();
  });

  test('it opens, carries binary both ways and closes like a browser socket', async () => {
    const fake = new FakeSocket();
    const ws = new PinnedWebSocket('wss://argus.local:7046/rtc', async () => fake);
    const events: string[] = [];
    let received: unknown = null;
    ws.onopen = () => events.push('open');
    ws.onmessage = (event) => {
      received = event.data;
    };
    ws.addEventListener('close', (event) => events.push(`close:${event.code}`), { once: true });
    await flush();
    expect(ws.readyState).toBe(0);
    fake.onOpen?.();
    expect(ws.readyState).toBe(1);
    ws.send(new Uint8Array([1, 2, 3]));
    expect(new Uint8Array(fake.sent[0] as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
    const frame = new Uint8Array([9]).buffer;
    fake.onMessage?.(null, frame);
    expect(received).toBe(frame);
    ws.close(1000, 'bye');
    expect(fake.closed).toEqual({ code: 1000, reason: 'bye' });
    fake.onClose?.(1000, 'bye');
    fake.onClose?.(1000, 'bye');
    expect(events).toEqual(['open', 'close:1000']);
    expect(ws.readyState).toBe(3);
  });

  test('a refused open is an error then an abnormal close', async () => {
    const ws = new PinnedWebSocket('wss://argus.local:7046/rtc', async () => {
      throw new Error('CERT_NOT_TRUSTED|bad chain');
    });
    const events: string[] = [];
    ws.addEventListener('error', () => events.push('error'));
    ws.onclose = (event) => events.push(`close:${event.code}:${event.wasClean}`);
    await flush();
    expect(events).toEqual(['error', 'close:1006:false']);
  });

  test('a close before the native socket exists closes it as soon as it opens', async () => {
    const fake = new FakeSocket();
    const ws = new PinnedWebSocket('wss://argus.local:7046/rtc', async () => fake);
    ws.close(1000, 'early');
    await flush();
    fake.onOpen?.();
    expect(fake.closed).toEqual({ code: 1000, reason: 'early' });
    expect(() => ws.send('x')).toThrow();
  });
});
