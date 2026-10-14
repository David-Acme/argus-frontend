import { NitroModules } from 'react-native-nitro-modules';
import { getLanguage } from '@/core/i18n';
import type { IArgusPushNative, IPushService } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { log } from '@/core/services/log';
import type { NotificationTokenRemoval, PushProvider } from '@/core/types';
import { IS_ANDROID } from '@/shared/constants';
import { registrationBodyOf, unpairPush } from './push-registration';

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

  async register(): Promise<void> {
    if (!IS_ANDROID) return;
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
      if (!answer.ok) log.warn('push', 'the device token was not registered', answer.errors?.code);
    } catch (error) {
      log.warn('push', 'the device token was not registered', error);
    }
  }

  async unpair(): Promise<void> {
    if (!IS_ANDROID) return;
    let native: IArgusPushNative;
    try {
      native = this.module();
    } catch (error) {
      log.warn('push', 'the native push module is unavailable; nothing to unpair', error);
      return;
    }
    await unpairPush({
      storedToken: () => native.storedToken(),
      unregister: unregisterToken,
      deleteToken: () => native.deleteToken(),
      deleteKeys: () => native.deleteKeys(),
    });
  }

  onDecline(listener: (callId: string) => void): () => void {
    this.declineListeners.add(listener);
    this.bindDecline();
    return () => {
      this.declineListeners.delete(listener);
    };
  }

  private bindDecline(): void {
    if (this.declineBound || !IS_ANDROID) return;
    try {
      this.module().setDeclineListener((callId) => {
        for (const listener of this.declineListeners) listener(callId);
      });
      this.declineBound = true;
    } catch (error) {
      log.warn('push', 'the native decline listener is unavailable', error);
    }
  }

  private module(): IArgusPushNative {
    this.native ??= createNativePush();
    return this.native;
  }
}

export const pushService: IPushService = new NativePushService();
