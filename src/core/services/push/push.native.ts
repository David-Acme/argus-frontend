import * as Notifications from 'expo-notifications';
import { NitroModules } from 'react-native-nitro-modules';
import { getLanguage } from '@/core/i18n';
import type { CallControlAction, CallEndpoint, IArgusPushNative, IPushService } from '@/core/interfaces';
import { callControlActionOf, callEndpointsOf } from './call-control';
import { httpService } from '@/core/services/http';
import { parseInAppAlert } from './in-app-alert';
import { useInAppAlertStore } from '@/core/stores/in-app-alert.store';
import { useAuthStore } from '@/core/stores';
import { log } from '@/core/services/log';
import type { NotificationTokenRemoval, PushProvider } from '@/core/types';
import { IS_ANDROID } from '@/shared/constants';
import {
  forwardPendingDeclines,
  hasSession,
  isSessionMissing,
  onTokenRotated,
  registrationBodyOf,
  unpairPush,
} from './push-registration';

const ASSISTANT_CALL_TIMEOUT_MS = 3000;

interface NitroModulesProxyLike {
  createHybridObject<T>(name: string): T;
}

const NATIVE_OBJECT = 'ArgusPush';
const PLATFORM = 'android';
const PROVIDER: PushProvider = 'fcm';

function createNativePush(): IArgusPushNative {
  const modules = NitroModules as unknown as NitroModulesProxyLike;
  return modules.createHybridObject<IArgusPushNative>(NATIVE_OBJECT);
}

async function unregisterToken(removal: NotificationTokenRemoval): Promise<void> {
  const answer = await httpService.delete('/notification-token', removal);
  if (!answer.ok) throw new Error(answer.errors?.code ?? 'UNREGISTER_FAILED');
}

class NativePushService implements IPushService {
  private native: IArgusPushNative | null = null;
  private readonly declineListeners = new Set<(callId: string) => void>();
  private declineBound = false;
  private tokenBound = false;
  private alertBound = false;
  private callControlBound = false;
  private readonly callControlListeners = new Set<(action: CallControlAction) => void>();

  bindListeners(): void {
    if (!IS_ANDROID) return;
    this.bindToken();
    this.bindAlert();
    this.bindDecline();
    this.bindCallControl();
  }

  async register(): Promise<void> {
    if (!IS_ANDROID) return;
    this.bindListeners();
    if (!hasSession(useAuthStore.getState().status)) return;
    try {
      const native = this.module();
      const token = await native.storedToken();
      if (!token) return;
      const keys = await native.keys();
      const body = registrationBodyOf({
        token,
        keys,
        platform: PLATFORM,
        lang: getLanguage(),
        provider: PROVIDER,
      });
      const answer = await httpService.post('/notification-token', body);
      if (!answer.ok && !isSessionMissing(answer.errors?.code)) {
        log.error('push', 'the device token was not registered', answer.errors?.code);
      }
    } catch (error) {
      log.error('push', 'the device token was not registered', error);
    }
  }

  async unpair(): Promise<void> {
    if (!IS_ANDROID) return;
    let native: IArgusPushNative;
    try {
      native = this.module();
    } catch (error) {
      log.error('push', 'the native push module is unavailable; nothing to unpair', error);
      return;
    }
    await unpairPush({
      storedToken: () => native.storedToken(),
      unregister: unregisterToken,
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

  telecomCallActive(): boolean {
    if (!IS_ANDROID) return false;
    try {
      return this.module().telecomCallActive();
    } catch (error) {
      log.error('push', 'the Telecom call state is unavailable', error);
      return false;
    }
  }

  async startAssistantCall(): Promise<boolean> {
    if (!IS_ANDROID) return false;
    try {
      const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ASSISTANT_CALL_TIMEOUT_MS));
      return await Promise.race([this.module().startAssistantCall(), timeout]);
    } catch (error) {
      log.error('push', 'the assistant call could not be registered', error);
      return false;
    }
  }

  callEndpoints(): CallEndpoint[] {
    if (!IS_ANDROID) return [];
    try {
      return callEndpointsOf(this.module().callEndpoints());
    } catch (error) {
      log.error('push', 'the call audio devices are unavailable', error);
      return [];
    }
  }

  selectCallEndpoint(id: string): void {
    if (!IS_ANDROID) return;
    try {
      this.module().selectCallEndpoint(id);
    } catch (error) {
      log.error('push', 'the call audio device could not be selected', error);
    }
  }

  setCallMuted(muted: boolean): void {
    if (!IS_ANDROID) return;
    try {
      this.module().setCallMuted(muted);
    } catch (error) {
      log.error('push', 'the call mute state could not be shared', error);
    }
  }

  onDecline(listener: (callId: string) => void): () => void {
    this.declineListeners.add(listener);
    this.bindDecline();
    return () => {
      this.declineListeners.delete(listener);
    };
  }

  async notificationsPermitted(): Promise<boolean> {
    return (await Notifications.getPermissionsAsync()).granted;
  }

  async requestNotificationsPermission(): Promise<boolean> {
    return (await Notifications.requestPermissionsAsync()).granted;
  }

  exactAlarmsAllowed(): boolean {
    if (!IS_ANDROID) return true;
    return this.module().exactAlarmsAllowed();
  }

  openExactAlarmSettings(): void {
    if (!IS_ANDROID) return;
    this.module().openExactAlarmSettings();
  }

  fullScreenAllowed(): boolean {
    if (!IS_ANDROID) return true;
    try {
      return this.module().canUseFullScreenIntent();
    } catch (error) {
      log.error('push', 'the full-screen permission could not be read', error);
      return true;
    }
  }

  openFullScreenSettings(): void {
    if (!IS_ANDROID) return;
    try {
      this.module().openFullScreenSettings();
    } catch (error) {
      log.error('push', 'the full-screen settings could not be opened', error);
    }
  }

  ackDecline(callId: string): void {
    if (!IS_ANDROID) return;
    try {
      this.module().ackDecline(callId);
    } catch (error) {
      log.error('push', 'the decline could not be acknowledged', error);
    }
  }

  stopOngoingCall(): void {
    if (!IS_ANDROID) return;
    try {
      this.module().stopOngoingCall();
    } catch (error) {
      log.error('push', 'the ongoing call could not be stopped', error);
    }
  }

  sendToBackground(): void {
    if (!IS_ANDROID) return;
    try {
      this.module().sendToBackground();
    } catch (error) {
      log.error('push', 'the app could not be sent to the background', error);
    }
  }

  isKeyguardLocked(): boolean {
    if (!IS_ANDROID) return false;
    try {
      return this.module().isKeyguardLocked();
    } catch (error) {
      log.error('push', 'the keyguard state could not be read', error);
      return true;
    }
  }

  outsideCallId(): string {
    if (!IS_ANDROID) return '';
    try {
      return this.module().outsideCallId();
    } catch (error) {
      log.error('push', 'the outside call could not be read', error);
      return '';
    }
  }

  overKeyguard(): boolean {
    if (!IS_ANDROID) return false;
    try {
      return this.module().overKeyguard();
    } catch (error) {
      log.error('push', 'the over-keyguard state could not be read', error);
      return false;
    }
  }

  drainDeclines(): void {
    if (!IS_ANDROID) return;
    forwardPendingDeclines(
      () => this.module().takeDeclines(),
      (callId) => this.emitDecline(callId)
    );
  }

  private emitDecline(callId: string): void {
    for (const listener of this.declineListeners) listener(callId);
  }

  private bindDecline(): void {
    if (this.declineBound || !IS_ANDROID) return;
    try {
      this.module().setDeclineListener((callId) => this.emitDecline(callId));
      this.declineBound = true;
    } catch (error) {
      log.error('push', 'the native decline listener is unavailable', error);
    }
  }

  private bindCallControl(): void {
    if (this.callControlBound || !IS_ANDROID) return;
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

  private bindAlert(): void {
    if (this.alertBound) return;
    try {
      this.module().setAlertListener((json) => {
        const alert = parseInAppAlert(json);
        if (alert) useInAppAlertStore.getState().show(alert);
      });
      this.alertBound = true;
    } catch (error) {
      log.error('push', 'the native alert listener is unavailable', error);
    }
  }

  private bindToken(): void {
    if (this.tokenBound) return;
    try {
      this.module().setTokenListener(() => {
        onTokenRotated(useAuthStore.getState().status, () => void this.register());
      });
      this.tokenBound = true;
    } catch (error) {
      log.error('push', 'the native token listener is unavailable', error);
    }
  }

  private module(): IArgusPushNative {
    this.native ??= createNativePush();
    return this.native;
  }
}

export const pushService: IPushService = new NativePushService();
