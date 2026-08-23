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
  updateInstanceIp,
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

  async adoptPairing(pairing: NetPairing, host: string, ip: string): Promise<void> {
    try {
      net.configureVerified(pairing.caPem, pairing.caFingerprint, host, ip);
      configuredKey = `${pairing.caPem}|${host}|${ip}`;
      await savePairing(pairing, host, ip);
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
    const send = (): Promise<NetHttpResult> =>
      net.request({
        url: options.url,
        method: options.method,
        headers: options.headers ?? {},
        body: options.body ?? '',
        files: options.files ?? [],
      });

    try {
      return await send();
    } catch (error) {
      const failure = toNetError(error, 'NETWORK_ERROR');
      if (failure.code !== 'NETWORK_ERROR' || !(await this.rediscover(instance.ip))) {
        throw failure;
      }
      try {
        return await send();
      } catch (retryError) {
        throw toNetError(retryError, 'NETWORK_ERROR');
      }
    }
  }

  /**
   * The server moved: its lease changed, or the phone came back on another
   * network. mDNS still finds it by name, so the pinned address is refreshed
   * instead of asking the user to pair again.
   */
  async refreshAddress(): Promise<boolean> {
    const instance = await loadInstance();
    return instance ? this.rediscover(instance.ip) : false;
  }

  private async rediscover(currentIp: string): Promise<boolean> {
    let found;
    try {
      found = await net.discover(DISCOVERY_TIMEOUT_MS);
    } catch {
      return false;
    }
    if (!found.ip || found.ip === currentIp) return false;

    await updateInstanceIp(found.ip);
    const instance = await loadInstance();
    if (!instance) return false;
    configuredKey = `${instance.caPem}|${instance.host}|${instance.ip}`;
    net.configure(instance.caPem, instance.host, instance.ip);
    return true;
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
      // Same story as an HTTP call: the address can go stale between two
      // reconnects, and the socket is the one that notices first.
      const failure = toNetError(error, 'NETWORK_ERROR');
      if (failure.code !== 'NETWORK_ERROR' || !(await this.rediscover(instance.ip))) {
        throw failure;
      }
      try {
        return await net.openSocket(options);
      } catch (retryError) {
        throw toNetError(retryError, 'NETWORK_ERROR');
      }
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
