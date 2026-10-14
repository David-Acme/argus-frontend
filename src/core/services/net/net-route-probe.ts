import { NET_ROUTE_PROBE_TIMEOUT_MS, NET_ROUTE_RELAY_HEAD_START_MS } from '@/shared/constants';
import type { NetPairedInstance, NetProbeOutcome, NetProbeReading, NetRouteChoice } from '@/core/types';
import { log } from '@/core/services/log';
import { loadInstance, rememberRoute } from './net-persistence';
import { chooseRoute, usableRemote } from './net-route-choice';
import { lanServiceUrl, SERVER_IDENTITY_PATH, serviceUrl } from './net-routes';

export type NetReach = (url: string) => Promise<NetProbeReading>;

const PROBE_BACKSTOP_MS = 1000;

const PROBE_OUTCOMES: readonly NetProbeOutcome[] = ['reached', 'absent', 'dns', 'connect', 'tls-peer-closed', 'pin'];

export interface NetProbeUrls {
  lan: string;
  relay: string | null;
}

export interface NetRouteReadings {
  lan: NetProbeReading;
  relay: NetProbeReading;
}

export function probeUrls(instance: NetPairedInstance): NetProbeUrls {
  return {
    lan: lanServiceUrl(instance, SERVER_IDENTITY_PATH),
    relay: usableRemote(instance.remote) ? serviceUrl({ ...instance, route: 'relay' }, SERVER_IDENTITY_PATH) : null,
  };
}

const unknownOutcomesLogged = new Set<string>();

export const readingOf = (reply: { outcome: string; address?: string; fingerprint?: string }): NetProbeReading => {
  const known = PROBE_OUTCOMES.find((outcome) => outcome === reply.outcome);
  if (known === undefined && !unknownOutcomesLogged.has(reply.outcome)) {
    unknownOutcomesLogged.add(reply.outcome);
    log.warn(
      'net',
      `the native probe answered ${reply.outcome}, a class this build does not know; it reads as connect, ` +
        'so the native and JS probe contracts differ'
    );
  }
  return {
    outcome: known ?? 'connect',
    address: reply.address ?? '',
    fingerprint: reply.fingerprint ?? '',
  };
};

const silent = (outcome: NetProbeOutcome): NetProbeReading => ({ outcome, address: '', fingerprint: '' });

export interface NetProbeClock {
  after(ms: number, fire: () => void): () => void;
}

export interface NetProbeTimings {
  timeoutMs: number;
  headStartMs: number;
  clock: NetProbeClock;
}

const systemClock: NetProbeClock = {
  after: (ms, fire) => {
    const timer = setTimeout(fire, ms);
    return () => clearTimeout(timer);
  },
};

export const NET_PROBE_TIMINGS: NetProbeTimings = {
  timeoutMs: NET_ROUTE_PROBE_TIMEOUT_MS,
  headStartMs: NET_ROUTE_RELAY_HEAD_START_MS,
  clock: systemClock,
};

function readingWithin(attempt: Promise<NetProbeReading>, timings: NetProbeTimings): Promise<NetProbeReading> {
  return new Promise((resolve) => {
    const cancel = timings.clock.after(timings.timeoutMs + PROBE_BACKSTOP_MS, () => resolve(silent('connect')));
    attempt.then(
      (reading) => {
        cancel();
        resolve(reading);
      },
      () => {
        cancel();
        resolve(silent('connect'));
      }
    );
  });
}

function relayAfterHeadStart(
  lan: Promise<NetProbeReading>,
  startRelay: () => Promise<NetProbeReading>,
  timings: NetProbeTimings
): Promise<NetProbeReading> {
  return new Promise((resolve) => {
    let started = false;
    let cancelHeadStart: () => void = () => undefined;
    const start = (): void => {
      if (started) return;
      started = true;
      cancelHeadStart();
      void startRelay().then(resolve);
    };
    cancelHeadStart = timings.clock.after(timings.headStartMs, start);
    void lan.then((reading) => {
      if (reading.outcome !== 'reached') start();
      else if (!started) {
        cancelHeadStart();
        resolve(silent('absent'));
      }
    });
  });
}

export async function measureRoute(
  instance: NetPairedInstance,
  reach: NetReach,
  timings: NetProbeTimings = NET_PROBE_TIMINGS
): Promise<NetRouteReadings> {
  const urls = probeUrls(instance);
  const lan = readingWithin(reach(urls.lan), timings);
  const relayUrl = urls.relay;
  const relay = relayUrl
    ? relayAfterHeadStart(lan, () => readingWithin(reach(relayUrl), timings), timings)
    : Promise.resolve(silent('absent'));
  const lanReading = await lan;
  return { lan: lanReading, relay: lanReading.outcome === 'reached' ? silent('absent') : await relay };
}

export class NetRouteKeeper {
  private probing: Promise<NetRouteChoice | null> | null = null;
  private last: NetRouteChoice | null = null;
  private lanSuspect = false;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly reach: NetReach,
    private readonly ready: () => Promise<void>
  ) {}

  probe(): Promise<NetRouteChoice | null> {
    if (this.probing) return this.probing;
    const attempt = this.measure().finally(() => {
      if (this.probing === attempt) this.probing = null;
    });
    this.probing = attempt;
    return attempt;
  }

  async settled(): Promise<void> {
    if (this.probing) await this.probing.catch(() => null);
  }

  current(): NetRouteChoice | null {
    return this.last;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  record(choice: NetRouteChoice): void {
    if (choice.status === 'home') this.lanSuspect = false;
    rememberRoute(choice.mode);
    this.publish(choice);
  }

  forget(): void {
    this.lanSuspect = false;
    this.publish(null);
  }

  private publish(choice: NetRouteChoice | null): void {
    const last = this.last;
    if (last?.mode === choice?.mode && last?.status === choice?.status && last?.relayRefused === choice?.relayRefused) {
      return;
    }
    this.last = choice;
    this.listeners.forEach((listener) => listener());
  }

  private noteLan(reading: NetProbeReading): void {
    if (reading.outcome === 'pin' && !this.lanSuspect) {
      log.warn(
        'net',
        `the paired address ${reading.address} presented a certificate the home's CA does not vouch for ` +
          `(SHA-256 ${reading.fingerprint}); the LAN is set aside until it answers under the pin`
      );
    }
    if (reading.outcome === 'pin') this.lanSuspect = true;
    if (reading.outcome === 'reached') this.lanSuspect = false;
  }

  private noteRelay(choice: NetRouteChoice, reading: NetProbeReading): void {
    if (choice.relayRefused && !this.last?.relayRefused) {
      log.error(
        'net',
        `the relay at ${reading.address} presented a certificate the home's CA does not vouch for ` +
          `(SHA-256 ${reading.fingerprint})`
      );
    }
  }

  private async measure(): Promise<NetRouteChoice | null> {
    await this.ready();
    const instance = await loadInstance();
    if (!instance) return null;
    const readings = await measureRoute(instance, this.reach);
    const wasSuspect = this.lanSuspect;
    this.noteLan(readings.lan);
    const lan: NetProbeOutcome =
      wasSuspect && readings.lan.outcome !== 'reached' ? 'pin' : readings.lan.outcome;
    const choice = chooseRoute({ lan, relay: readings.relay.outcome });
    this.noteRelay(choice, readings.relay);
    this.record(choice);
    return choice;
  }
}
