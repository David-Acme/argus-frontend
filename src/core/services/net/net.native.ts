import { createArgusNet } from 'argus-net';
import type { ArgusSocket, NetSocketOptions } from 'argus-net';
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

const net = createArgusNet();
let configuredKey: string | null = null;

class NativeArgusNetService implements IArgusNetService {
  async discover(timeoutMs: number = DISCOVERY_TIMEOUT_MS): Promise<NetDiscovery> {
    try {
      return await net.discover(timeoutMs);
    } catch (error) {
      throw toNetError(error, 'DISCOVERY_NOT_FOUND');
    }
  }

  async pair(host: string, ip: string, port: number, code: string): Promise<NetPairing> {
    try {
      const result = await net.pair(host, ip, port, code);
      configuredKey = `${result.caPem}|${host}|${ip}`;
      net.configure(result.caPem, host, ip);
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

    const key = `${instance.caPem}|${instance.host}|${instance.ip}`;
    if (key !== configuredKey) {
      configuredKey = key;
      net.configure(instance.caPem, instance.host, instance.ip);
    }
    try {
      return await net.request({
        url: options.url,
        method: options.method,
        headers: options.headers ?? {},
        body: options.body ?? '',
        files: options.files ?? [],
      });
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async requestTrustAny(options: NetHttpRequest): Promise<NetHttpResult> {
    try {
      return await net.request({
        url: options.url,
        method: options.method,
        headers: options.headers ?? {},
        body: options.body ?? '',
        files: options.files ?? [],
        trustAny: true,
      });
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  /** The WS must ride the SAME configured instance (CA + host) as HTTP. */
  async openSocket(options: NetSocketOptions): Promise<ArgusSocket> {
    const instance = await loadInstance();
    if (!instance) {
      throw { code: 'PAIRING_REQUIRED', message: 'Server is not paired yet' } as NetError;
    }
    const key = `${instance.caPem}|${instance.host}|${instance.ip}`;
    if (key !== configuredKey) {
      configuredKey = key;
      net.configure(instance.caPem, instance.host, instance.ip);
    }
    try {
      return await net.openSocket(options);
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
    configuredKey = null;
    await clearInstance();
  }
}

export const netService = new NativeArgusNetService();
