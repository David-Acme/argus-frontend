import { describe, expect, test } from 'bun:test';
import type { IArgusPushNative } from '@/core/interfaces';
import type { NotificationTokenBody, NotificationTokenRemoval } from '@/core/types';
import type { PushRegistrationPort } from '@/core/services/push/ios-push';
import { IosPushService } from '@/core/services/push/ios-push';

const KEYS = { publicKey: 'A'.repeat(43), keyId: 'B'.repeat(22) };

class FakeNative implements IArgusPushNative {
  token: string | null = 'voip-token-1';
  active = false;
  fail = false;
  endpoints = '[]';
  declines: string[] = [];
  readonly muted: boolean[] = [];
  readonly selected: string[] = [];
  readonly stopped: number[] = [];
  declineListener: ((callId: string) => void) | null = null;
  tokenListener: ((token: string) => void) | null = null;
  callControlListener: ((action: string) => void) | null = null;
  alertListener: ((alertJson: string) => void) | null = null;

  private guard(): void {
    if (this.fail) throw new Error('PUSH_UNAVAILABLE|no native module');
  }

  async keys(): Promise<{ publicKey: string; keyId: string }> {
    this.guard();
    return KEYS;
  }

  async storedToken(): Promise<string | null> {
    this.guard();
    return this.token;
  }

  async deleteToken(): Promise<void> {
    this.guard();
    this.token = null;
  }

  async deleteKeys(): Promise<void> {
    this.guard();
  }

  setDeclineListener(listener: (callId: string) => void): void {
    this.declineListener = listener;
  }

  setTokenListener(listener: (token: string) => void): void {
    this.tokenListener = listener;
  }

  setAlertListener(listener: (alertJson: string) => void): void {
    this.alertListener = listener;
  }

  setCallControlListener(listener: (action: string) => void): void {
    this.callControlListener = listener;
  }

  telecomCallActive(): boolean {
    this.guard();
    return this.active;
  }

  async startAssistantCall(): Promise<boolean> {
    this.guard();
    return true;
  }

  callEndpoints(): string {
    this.guard();
    return this.endpoints;
  }

  selectCallEndpoint(id: string): void {
    this.guard();
    this.selected.push(id);
  }

  backgroundAllowed(): boolean {
    return true;
  }

  requestBackground(): void {}

  setCallMuted(muted: boolean): void {
    this.guard();
    this.muted.push(muted);
  }

  takeDeclines(): string[] {
    this.guard();
    const taken = this.declines;
    this.declines = [];
    return taken;
  }

  ackDecline(callId: string): void {
    this.guard();
    this.declines = this.declines.filter((id) => id !== callId);
  }

  sendToBackground(): void {}

  stopOngoingCall(): void {
    this.guard();
    this.stopped.push(Date.now());
  }

  isKeyguardLocked(): boolean {
    return false;
  }

  overKeyguard(): boolean {
    return false;
  }

  outsideCallId(): string {
    return '';
  }

  exactAlarmsAllowed(): boolean {
    return true;
  }

  openExactAlarmSettings(): void {}

  canUseFullScreenIntent(): boolean {
    return true;
  }

  openFullScreenSettings(): void {}

  fullScreenExplained(): boolean {
    return false;
  }

  setFullScreenExplained(_value: boolean): void {}

  recordTrace(_phase: string, _outcome: string, _reason: string): void {}
}

function registrationRecorder() {
  const bodies: NotificationTokenBody[] = [];
  const removed: NotificationTokenRemoval[] = [];
  let failing = false;
  const port: PushRegistrationPort = {
    post: async (body) => {
      if (failing) throw new Error('offline');
      bodies.push(body);
      return { ok: true, code: null };
    },
    remove: async (removal) => {
      removed.push(removal);
    },
  };
  return {
    port,
    bodies,
    removed,
    setFailing: (value: boolean) => {
      failing = value;
    },
  };
}

function build(status: 'signed-in' | 'signed-out' = 'signed-in') {
  const native = new FakeNative();
  const registration = registrationRecorder();
  const service = new IosPushService({
    native: () => native,
    registration: registration.port,
    status: () => status,
    language: () => 'es',
    platform: 'ios',
    provider: 'apns_voip',
  });
  return { native, registration, service };
}

describe('the iOS push service call-control seam', () => {
  test('the four call-control actions the CallKit module sends reach every listener', () => {
    const { native, service } = build();
    const seen: string[] = [];
    service.onCallControl((action) => seen.push(action));
    service.bindListeners();
    for (const action of ['hangup', 'mute-on', 'mute-off', 'endpoints']) {
      native.callControlListener?.(action);
    }
    expect(seen).toEqual(['hangup', 'mute-on', 'mute-off', 'endpoints']);
  });

  test('an action outside the vocabulary is dropped', () => {
    const { native, service } = build();
    const seen: string[] = [];
    service.onCallControl((action) => seen.push(action));
    service.bindListeners();
    native.callControlListener?.('speaker');
    native.callControlListener?.('');
    expect(seen).toEqual([]);
  });

  test('an unsubscribed listener stops receiving', () => {
    const { native, service } = build();
    const seen: string[] = [];
    const unsubscribe = service.onCallControl((action) => seen.push(action));
    service.bindListeners();
    native.callControlListener?.('hangup');
    unsubscribe();
    native.callControlListener?.('hangup');
    expect(seen).toEqual(['hangup']);
  });

  test('the native listener is bound once', () => {
    const { native, service } = build();
    let binds = 0;
    const counter = {
      setCallControlListener: (listener: (action: string) => void) => {
        binds += 1;
        native.callControlListener = listener;
      },
    };
    native.setCallControlListener = counter.setCallControlListener;
    service.bindListeners();
    service.bindListeners();
    service.onCallControl(() => undefined);
    expect(binds).toBe(1);
  });
});

describe('the iOS push service declines', () => {
  test('a decline the module held reaches the listener, and ack reaches the module', () => {
    const { native, service } = build();
    const declined: string[] = [];
    service.onDecline((callId) => declined.push(callId));
    service.bindListeners();
    native.declineListener?.('call-41');
    native.declines = ['call-42', 'call-43'];
    service.drainDeclines();
    service.ackDecline('call-43');
    expect(declined).toEqual(['call-41', 'call-42', 'call-43']);
    expect(native.declines).toEqual([]);
  });

  test('a module that refuses the queue is survivable', () => {
    const { native, service } = build();
    const declined: string[] = [];
    service.onDecline((callId) => declined.push(callId));
    service.bindListeners();
    native.fail = true;
    service.drainDeclines();
    expect(declined).toEqual([]);
  });
});

describe('the iOS push service registration', () => {
  test('the device token travels as ios with apns_voip and the module keys', async () => {
    const { registration, service } = build();
    await service.register();
    expect(registration.bodies).toEqual([
      {
        token: 'voip-token-1',
        platform: 'ios',
        lang: 'es',
        provider: 'apns_voip',
        publicKey: KEYS.publicKey,
        keyId: KEYS.keyId,
      },
    ]);
  });

  test('a signed-out device and a device without a token register nothing', async () => {
    const signedOut = build('signed-out');
    await signedOut.service.register();
    expect(signedOut.registration.bodies).toEqual([]);
    const tokenless = build();
    tokenless.native.token = null;
    await tokenless.service.register();
    expect(tokenless.registration.bodies).toEqual([]);
  });

  test('a refused post does not throw', async () => {
    const { registration, service } = build();
    registration.setFailing(true);
    await service.register();
    expect(registration.bodies).toEqual([]);
  });

  test('the token rotation registers again', async () => {
    const { native, registration, service } = build();
    service.bindListeners();
    native.token = 'voip-token-2';
    native.tokenListener?.('voip-token-2');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(registration.bodies.map((body) => body.token)).toEqual(['voip-token-2']);
  });

  test('unpair unregisters the stored token and deletes the token and the keys', async () => {
    const { native, registration, service } = build();
    await service.unpair();
    expect(registration.removed).toEqual([{ token: 'voip-token-1' }]);
    expect(native.token).toBeNull();
  });

  test('unpair with no native module does nothing', async () => {
    const { native, registration, service } = build();
    native.fail = true;
    await service.unpair();
    expect(registration.removed).toEqual([]);
  });
});

describe('the iOS push service call surface', () => {
  test('the CallKit call state is the module answer, and false when it refuses', () => {
    const { native, service } = build();
    expect(service.telecomCallActive()).toBe(false);
    native.active = true;
    expect(service.telecomCallActive()).toBe(true);
    native.fail = true;
    expect(service.telecomCallActive()).toBe(false);
  });

  test('the endpoints the module reads are parsed and a malformed list is empty', () => {
    const { native, service } = build();
    native.endpoints = JSON.stringify([{ id: 'spk', kind: 'speaker', name: 'Altavoz', active: true }]);
    expect(service.callEndpoints()).toEqual([{ id: 'spk', kind: 'speaker', name: 'Altavoz', active: true }]);
    native.endpoints = 'not json';
    expect(service.callEndpoints()).toEqual([]);
  });

  test('mute, endpoint selection and ending the call reach the module', () => {
    const { native, service } = build();
    service.setCallMuted(true);
    service.setCallMuted(false);
    service.selectCallEndpoint('spk');
    service.stopOngoingCall();
    expect(native.muted).toEqual([true, false]);
    expect(native.selected).toEqual(['spk']);
    expect(native.stopped.length).toBe(1);
  });

  test('the keyguard and full-screen answers are the iOS ones', () => {
    const { service } = build();
    expect(service.isKeyguardLocked()).toBe(false);
    expect(service.overKeyguard()).toBe(false);
    expect(service.outsideCallId()).toBe('');
    expect(service.exactAlarmsAllowed()).toBe(true);
    expect(service.fullScreenAllowed()).toBe(true);
    expect(service.backgroundAllowed()).toBe(true);
  });
});
