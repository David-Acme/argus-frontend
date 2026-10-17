import type {
  AuthStatus,
  NotificationTokenBody,
  NotificationTokenRemoval,
  PushPlatform,
  PushProvider,
} from '@/core/types';
import type { CallControlAction, CallEndpoint, IArgusPushNative, IPushService } from '@/core/interfaces';
import { log } from '@/core/services/log';
import { callControlActionOf, callEndpointsOf } from './call-control';
import {
  forwardPendingDeclines,
  hasSession,
  isSessionMissing,
  onTokenRotated,
  registrationBodyOf,
  unpairPush,
} from './push-registration';

const ASSISTANT_CALL_TIMEOUT_MS = 3000;

export type PushRegistrationPort = {
  post(body: NotificationTokenBody): Promise<{ ok: boolean; code: string | null }>;
  remove(removal: NotificationTokenRemoval): Promise<void>;
};

export type IosPushServiceOptions = {
  native: () => IArgusPushNative;
  registration: PushRegistrationPort;
  status: () => AuthStatus;
  language: () => string;
  platform: PushPlatform;
  provider: PushProvider;
};

export class IosPushService implements IPushService {
  private native: IArgusPushNative | null = null;
  private readonly declineListeners = new Set<(callId: string) => void>();
  private readonly callControlListeners = new Set<(action: CallControlAction) => void>();
  private declineBound = false;
  private tokenBound = false;
  private callControlBound = false;

  constructor(private readonly options: IosPushServiceOptions) {}

  bindListeners(): void {
    this.bindToken();
    this.bindDecline();
    this.bindCallControl();
  }

  async register(): Promise<void> {
    this.bindListeners();
    if (!hasSession(this.options.status())) return;
    try {
      const native = this.module();
      const token = await native.storedToken();
      if (!token) return;
      const keys = await native.keys();
      const body = registrationBodyOf({
        token,
        keys,
        platform: this.options.platform,
        lang: this.options.language(),
        provider: this.options.provider,
      });
      const answer = await this.options.registration.post(body);
      if (!answer.ok && !isSessionMissing(answer.code)) {
        log.error('push', 'the device token was not registered', answer.code);
      }
    } catch (error) {
      log.error('push', 'the device token was not registered', error);
    }
  }

  async unpair(): Promise<void> {
    let native: IArgusPushNative;
    try {
      native = this.module();
    } catch (error) {
      log.error('push', 'the native push module is unavailable; nothing to unpair', error);
      return;
    }
    await unpairPush({
      storedToken: () => native.storedToken(),
      unregister: (removal) => this.options.registration.remove(removal),
      deleteToken: () => native.deleteToken(),
      deleteKeys: () => native.deleteKeys(),
    });
  }

  onCallControl(listener: (action: CallControlAction) => void): () => void {
    this.callControlListeners.add(listener);
    this.bindCallControl();
    return () => {
      this.callControlListeners.delete(listener);
    };
  }

  onDecline(listener: (callId: string) => void): () => void {
    this.declineListeners.add(listener);
    this.bindDecline();
    return () => {
      this.declineListeners.delete(listener);
    };
  }

  telecomCallActive(): boolean {
    try {
      return this.module().telecomCallActive();
    } catch (error) {
      log.error('push', 'the CallKit call state is unavailable', error);
      return false;
    }
  }

  async startAssistantCall(): Promise<boolean> {
    try {
      const timeout = new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), ASSISTANT_CALL_TIMEOUT_MS)
      );
      return await Promise.race([this.module().startAssistantCall(), timeout]);
    } catch (error) {
      log.error('push', 'the assistant call could not be registered', error);
      return false;
    }
  }

  callEndpoints(): CallEndpoint[] {
    try {
      return callEndpointsOf(this.module().callEndpoints());
    } catch (error) {
      log.error('push', 'the call audio devices are unavailable', error);
      return [];
    }
  }

  selectCallEndpoint(id: string): void {
    try {
      this.module().selectCallEndpoint(id);
    } catch (error) {
      log.error('push', 'the call audio device could not be selected', error);
    }
  }

  setCallMuted(muted: boolean): void {
    try {
      this.module().setCallMuted(muted);
    } catch (error) {
      log.error('push', 'the call mute state could not be shared', error);
    }
  }

  drainDeclines(): void {
    forwardPendingDeclines(
      () => this.module().takeDeclines(),
      (callId) => this.emitDecline(callId)
    );
  }

  ackDecline(callId: string): void {
    try {
      this.module().ackDecline(callId);
    } catch (error) {
      log.error('push', 'the decline could not be acknowledged', error);
    }
  }

  stopOngoingCall(): void {
    try {
      this.module().stopOngoingCall();
    } catch (error) {
      log.error('push', 'the ongoing call could not be stopped', error);
    }
  }

  sendToBackground(): void {}

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

  fullScreenAllowed(): boolean {
    return true;
  }

  openFullScreenSettings(): void {}

  backgroundAllowed(): boolean {
    return true;
  }

  requestBackground(): void {}

  async notificationsPermitted(): Promise<boolean> {
    const Notifications = await import('expo-notifications');
    return (await Notifications.getPermissionsAsync()).granted;
  }

  async requestNotificationsPermission(): Promise<boolean> {
    const Notifications = await import('expo-notifications');
    return (await Notifications.requestPermissionsAsync()).granted;
  }

  private emitDecline(callId: string): void {
    for (const listener of this.declineListeners) listener(callId);
  }

  private bindDecline(): void {
    if (this.declineBound) return;
    try {
      this.module().setDeclineListener((callId) => this.emitDecline(callId));
      this.declineBound = true;
    } catch (error) {
      log.error('push', 'the native decline listener is unavailable', error);
    }
  }

  private bindToken(): void {
    if (this.tokenBound) return;
    try {
      this.module().setTokenListener(() => {
        onTokenRotated(this.options.status(), () => void this.register());
      });
      this.tokenBound = true;
    } catch (error) {
      log.error('push', 'the native token listener is unavailable', error);
    }
  }

  private bindCallControl(): void {
    if (this.callControlBound) return;
    try {
      this.module().setCallControlListener((action) => {
        const parsed = callControlActionOf(action);
        if (!parsed) return;
        for (const listener of this.callControlListeners) listener(parsed);
      });
      this.callControlBound = true;
    } catch (error) {
      log.error('push', 'the native call control listener is unavailable', error);
    }
  }

  private module(): IArgusPushNative {
    this.native ??= this.options.native();
    return this.native;
  }
}
