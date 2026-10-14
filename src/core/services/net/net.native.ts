import { createArgusNet } from 'argus-net';
import type { ArgusSocket, NetSocketOptions } from 'argus-net';
import Constants from 'expo-constants';
import { DISCOVERY_TIMEOUT_MS, IS_IOS, NET_ROUTE_PROBE_TIMEOUT_MS } from '@/shared/constants';
import type { IArgusNetService } from '@/core/interfaces';
import {
  clearInstance,
  isPaired,
  loadInstance,
  matchesExpectation,
  savePairing,
  saveRemote,
  toNetError,
  updateInstanceAddress,
} from './net-persistence';
import { NetRouteKeeper, readingOf } from './net-route-probe';
import {
  addressUnreachable,
  lanServiceUrl,
  mayRediscover,
  relocatedInstance,
  SERVER_IDENTITY_PATH,
  urlAt,
} from './net-routes';
import { clientIdentityHeaders, withClientIdentity } from './client-identity';
import { withDeviceCredential } from './device-credential';
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
  NetProbeReading,
  NetRemoteProfile,
  NetRouteChoice,
} from '@/core/types';

const net = createArgusNet();
let configuredKey: string | null = null;

const CLIENT_IDENTITY = clientIdentityHeaders({
  platform: IS_IOS ? 'ios' : 'android',
  appVersion: Constants.expoConfig?.version ?? '',
  deviceName: Constants.deviceName ?? null,
});

const identified = (headers: Record<string, string> | undefined): Record<string, string> =>
  withClientIdentity(headers, CLIENT_IDENTITY);

const authenticated = (headers: Record<string, string> | undefined): Record<string, string> =>
  withDeviceCredential(identified(headers));

const fingerprintMismatch = (): NetError => ({
  code: 'FINGERPRINT_MISMATCH',
  message: 'The server fingerprint does not match the scanned QR',
});

type NativeConfiguration = Pick<NetPairedInstance, 'caPem' | 'host' | 'ip' | 'remote'>;

const configurationKey = (target: NativeConfiguration): string =>
  [target.caPem, target.host, target.ip, target.remote?.homeId ?? '', target.remote?.domain ?? ''].join('|');

const applyConfiguration = (target: NativeConfiguration): void => {
  net.configure(target.caPem, target.host, target.ip);
  net.configureRemote(target.remote?.homeId ?? '', target.remote?.domain ?? '');
  configuredKey = configurationKey(target);
};

const configureFor = (target: NativeConfiguration): void => {
  if (configurationKey(target) !== configuredKey) applyConfiguration(target);
};

class NativeArgusNetService implements IArgusNetService {
  private rediscovery: Promise<boolean> | null = null;
  private lastRediscoveryFailureAt = 0;
  private readonly routes = new NetRouteKeeper(
    (url) => this.reach(url),
    () => this.settledRediscovery()
  );

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
      applyConfiguration({ caPem: pairing.caPem, host, ip });
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
      net.configureRemote('', '');
      configuredKey = configurationKey({ caPem: pairing.caPem, host, ip });
      await savePairing(input);
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async request(options: NetHttpRequest): Promise<NetHttpResult> {
    await this.settledRediscovery();
    await this.routes.settled();
    const instance = await loadInstance();
    if (!instance) {
      throw { code: 'PAIRING_REQUIRED', message: 'Server is not paired yet' } as NetError;
    }

    configureFor(instance);
    const send = (url: string): Promise<NetHttpResult> =>
      net.request({
        url,
        method: options.method,
        headers: authenticated(options.headers),
        body: options.body ?? '',
        files: options.files ?? [],
      });

    try {
      return await send(options.url);
    } catch (error) {
      const failure = toNetError(error, 'NETWORK_ERROR');
      if (!addressUnreachable(failure.code) || !(await this.rediscover(instance.ip))) {
        throw failure;
      }
      try {
        return await send(urlAt(options.url, (await loadInstance()) ?? instance));
      } catch (retryError) {
        throw toNetError(retryError, 'NETWORK_ERROR');
      }
    }
  }

  async refreshAddress(): Promise<boolean> {
    const instance = await loadInstance();
    if (!instance) return false;
    if (await this.rediscover(instance.ip).catch(() => false)) {
      this.routes.record({ mode: 'lan', status: 'home', relayRefused: false });
      return true;
    }
    const choice = await this.routes.probe().catch(() => null);
    return choice !== null && (choice.mode ?? 'lan') !== (instance.route ?? 'lan');
  }

  probeRoute(): Promise<NetRouteChoice | null> {
    return this.routes.probe();
  }

  routeChoice(): NetRouteChoice | null {
    return this.routes.current();
  }

  onRouteChoice(listener: () => void): () => void {
    return this.routes.onChange(listener);
  }

  private async reach(url: string): Promise<NetProbeReading> {
    const instance = await loadInstance();
    if (!instance) throw { code: 'PAIRING_REQUIRED', message: 'Server is not paired yet' } as NetError;
    configureFor(instance);
    return readingOf(await net.probe({ url, headers: identified(undefined), timeoutMs: NET_ROUTE_PROBE_TIMEOUT_MS }));
  }

  async rememberRemote(remote: NetRemoteProfile): Promise<boolean> {
    return saveRemote(remote);
  }

  private async settledRediscovery(): Promise<void> {
    if (this.rediscovery) await this.rediscovery.catch(() => false);
  }

  private rediscover(currentIp: string): Promise<boolean> {
    if (this.rediscovery) return this.rediscovery;
    if (!mayRediscover(this.lastRediscoveryFailureAt, Date.now())) return Promise.resolve(false);
    const attempt = this.relocate(currentIp)
      .then((moved) => {
        if (!moved) this.lastRediscoveryFailureAt = Date.now();
        return moved;
      })
      .catch((error: unknown) => {
        this.lastRediscoveryFailureAt = Date.now();
        throw error;
      })
      .finally(() => {
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
        url: lanServiceUrl(candidate, SERVER_IDENTITY_PATH),
        method: 'GET',
        headers: identified(undefined),
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
        headers: identified(options.headers),
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
    await this.routes.settled();
    const instance = await loadInstance();
    if (!instance) {
      throw { code: 'PAIRING_REQUIRED', message: 'Server is not paired yet' } as NetError;
    }
    configureFor(instance);
    const identified = { ...options, headers: authenticated(options.headers) };
    try {
      return await net.openSocket(identified);
    } catch (error) {
      const failure = toNetError(error, 'NETWORK_ERROR');
      if (!addressUnreachable(failure.code) || !(await this.rediscover(instance.ip))) {
        throw failure;
      }
      try {
        return await net.openSocket({
          ...identified,
          url: urlAt(options.url, (await loadInstance()) ?? instance),
        });
      } catch (retryError) {
        throw toNetError(retryError, 'NETWORK_ERROR');
      }
    }
  }

  async isPaired(): Promise<boolean> {
    return isPaired();
  }

  async instance(): Promise<NetPairedInstance | null> {
    await this.routes.settled();
    return loadInstance();
  }

  async unpair(): Promise<void> {
    configuredKey = null;
    this.routes.forget();
    await clearInstance();
  }
}

export const netService = new NativeArgusNetService();
