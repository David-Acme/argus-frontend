import { NitroModules } from 'react-native-nitro-modules';
import { getLanguage } from '@/core/i18n';
import type { IArgusPushNative, IPushService } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { useAuthStore } from '@/core/stores';
import { IosPushService } from './ios-push';

interface NitroModulesProxyLike {
  createHybridObject<T>(name: string): T;
}

const NATIVE_OBJECT = 'ArgusPush';
const PLATFORM = 'ios';
const PROVIDER = 'apns_voip';

function createNativePush(): IArgusPushNative {
  const modules = NitroModules as unknown as NitroModulesProxyLike;
  return modules.createHybridObject<IArgusPushNative>(NATIVE_OBJECT);
}

export const pushService: IPushService = new IosPushService({
  native: createNativePush,
  registration: {
    post: async (body) => {
      const answer = await httpService.post('/notification-token', body);
      return { ok: answer.ok, code: answer.errors?.code ?? null };
    },
    remove: async (removal) => {
      const answer = await httpService.delete('/notification-token', removal);
      if (!answer.ok) throw new Error(answer.errors?.code ?? 'UNREGISTER_FAILED');
    },
  },
  status: () => useAuthStore.getState().status,
  language: getLanguage,
  platform: PLATFORM,
  provider: PROVIDER,
});
