import { invoke } from '@tauri-apps/api/core';

import { DISCOVERY_TIMEOUT_MS } from '@/shared/constants';
import type { IArgusNetService } from '@/core/interfaces';
import {
  clearInstance,
  isPaired,
  loadInstance,
  savePairing,
  toNetError,
} from './net-persistence';
import type {
  NetDiscovery,
  NetError,
  NetHttpRequest,
  NetHttpResult,
  NetPairedInstance,
  NetPairing,
} from '@/core/types';

class WebArgusNetService implements IArgusNetService {
  async discover(timeoutMs: number = DISCOVERY_TIMEOUT_MS): Promise<NetDiscovery> {
    try {
      return await invoke<NetDiscovery>('argus_discover', { timeoutMs });
    } catch (error) {
      throw toNetError(error, 'DISCOVERY_NOT_FOUND');
    }
  }

  async pair(host: string, ip: string, port: number, code: string): Promise<NetPairing> {
    try {
      const result = await invoke<NetPairing>('argus_pair', { host, ip, port, code });
      await savePairing(result, host, ip);
      return result;
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async request(options: NetHttpRequest): Promise<NetHttpResult> {
    const instance = await loadInstance();
    if (!instance) {
      throw { code: 'PAIRING_REQUIRED', message: 'Server is not paired yet' } as NetError;
    }

    try {
      return await invoke<NetHttpResult>('argus_request', {
        request: {
          url: options.url,
          method: options.method,
          headers: options.headers ?? {},
          body: options.body ?? '',
          files: options.files ?? [],
        },
        caPem: instance.caPem,
        allowedHost: instance.host,
        ip: instance.ip,
      });
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async isPaired(): Promise<boolean> {
    return isPaired();
  }

  async instance(): Promise<NetPairedInstance | null> {
    return loadInstance();
  }

  async unpair(): Promise<void> {
    await clearInstance();
  }
}

export const netService = new WebArgusNetService();
