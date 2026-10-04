import { createArgusNet } from 'argus-net';
import type { ArgusSocket, NetSocketOptions } from 'argus-net';
import { DISCOVERY_TIMEOUT_MS } from '@/shared/constants';
import type { IArgusNetService } from '@/core/interfaces';
import {
  clearInstance,
  isPaired,
  loadInstance,
  matchesExpectation,
  savePairing,
  toNetError,
  updateInstanceAddress,
} from './net-persistence';
import { relocatedInstance, SERVER_IDENTITY_PATH, serviceUrl } from './net-routes';
import type {
  NetAdoptInput,
  NetDiscovery,
  NetError,
  NetHttpRequest,
  NetHttpResult,
  NetPairInput,
  NetPairedInstance,
  NetPairing,
  NetPin,
} from '@/core/types';

const net = createArgusNet();
let configuredKey: string | null = null;

const fingerprintMismatch = (): NetError => ({
  code: 'FINGERPRINT_MISMATCH',
  message: 'The server fingerprint does not match the scanned QR',
});

class NativeArgusNetService implements IArgusNetService {
  private rediscovery: Promise<boolean> | null = null;

  async discover(timeoutMs: number = DISCOVERY_TIMEOUT_MS): Promise<NetDiscovery> {
    try {
      return await net.discover(timeoutMs);
    } catch (error) {
      throw toNetError(error, 'DISCOVERY_NOT_FOUND');
    }
  }

  async pair(input: NetPairInput): Promise<NetPairing> {
    const { host, ip, port, code, routes, expect } = input;
    let pairing: NetPairing;
    try {
      pairing = await net.pair(host, ip, port, code);
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
    if (!matchesExpectation(pairing, expect)) throw fingerprintMismatch();
    try {
      configuredKey = `${pairing.caPem}|${host}|${ip}`;
      net.configure(pairing.caPem, host, ip);
      await savePairing({ pairing, host, ip, routes });
      return pairing;
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async adoptPairing(input: NetAdoptInput): Promise<void> {
    const { pairing, host, ip } = input;
    try {
      net.configureVerified(pairing.caPem, pairing.caFingerprint, host, ip);
      configuredKey = `${pairing.caPem}|${host}|${ip}`;
      await savePairing(input);
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async request(options: NetHttpRequest): Promise<NetHttpResult> {
    await this.settledRediscovery();
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

  async refreshAddress(): Promise<boolean> {
    const instance = await loadInstance();
    return instance ? this.rediscover(instance.ip) : false;
  }

  private async settledRediscovery(): Promise<void> {
    if (this.rediscovery) await this.rediscovery.catch(() => false);
  }

  private rediscover(currentIp: string): Promise<boolean> {
    if (this.rediscovery) return this.rediscovery;
    const attempt = this.relocate(currentIp).finally(() => {
      if (this.rediscovery === attempt) this.rediscovery = null;
    });
    this.rediscovery = attempt;
    return attempt;
  }

  private async relocate(currentIp: string): Promise<boolean> {
    const instance = await loadInstance();
    if (!instance || instance.ip !== currentIp) return false;
    let found;
    try {
      found = await net.discover(DISCOVERY_TIMEOUT_MS);
    } catch {
      return false;
    }
    const candidate = relocatedInstance(instance, found);
    if (!candidate || !(await this.holdsPairedCa(candidate))) return false;
    await updateInstanceAddress({ ip: candidate.ip, routes: candidate.routes });
    return true;
  }

  private async holdsPairedCa(candidate: NetPairedInstance): Promise<boolean> {
    configuredKey = null;
    net.configure(candidate.caPem, candidate.host, candidate.ip);
    try {
      await net.request({
        url: serviceUrl(candidate, SERVER_IDENTITY_PATH),
        method: 'GET',
        headers: {},
        body: '',
        files: [],
      });
      return true;
    } catch {
      return false;
    } finally {
      configuredKey = null;
    }
  }

  async requestPinned(options: NetHttpRequest, pin: NetPin): Promise<NetHttpResult> {
    try {
      return await net.request({
        url: options.url,
        method: options.method,
        headers: options.headers ?? {},
        body: options.body ?? '',
        files: options.files ?? [],
        pin: { caFingerprint: pin.caFingerprint, host: pin.host },
      });
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async openSocket(options: NetSocketOptions): Promise<ArgusSocket> {
    await this.settledRediscovery();
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
