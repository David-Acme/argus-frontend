import { NET_ROUTE_PROBE_TIMEOUT_MS, NET_ROUTE_RELAY_HEAD_START_MS } from '@/shared/constants';
import type { NetPairedInstance, NetProbeOutcome, NetRouteChoice } from '@/core/types';
import { loadInstance, rememberRoute } from './net-persistence';
import { chooseRoute, usableRemote } from './net-route-choice';
import { lanServiceUrl, SERVER_IDENTITY_PATH, serviceUrl } from './net-routes';

export type NetReach = (url: string) => Promise<unknown>;

export interface NetProbeUrls {
  lan: string;
  relay: string | null;
}

export function probeUrls(instance: NetPairedInstance): NetProbeUrls {
  return {
    lan: lanServiceUrl(instance, SERVER_IDENTITY_PATH),
    relay: usableRemote(instance.remote) ? serviceUrl({ ...instance, route: 'relay' }, SERVER_IDENTITY_PATH) : null,
  };
}

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

function outcomeOf(attempt: Promise<unknown>, timings: NetProbeTimings): Promise<NetProbeOutcome> {
  return new Promise((resolve) => {
    const cancel = timings.clock.after(timings.timeoutMs, () => resolve('failed'));
    attempt.then(
      () => {
        cancel();
        resolve('reached');
      },
      () => {
        cancel();
        resolve('failed');
      }
    );
  });
}

function relayAfterHeadStart(
  lan: Promise<NetProbeOutcome>,
  startRelay: () => Promise<NetProbeOutcome>,
  timings: NetProbeTimings
): Promise<NetProbeOutcome> {
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
    void lan.then((outcome) => {
      if (outcome !== 'reached') start();
      else if (!started) {
        cancelHeadStart();
        resolve('absent');
      }
    });
  });
}

export async function measureRoute(
  instance: NetPairedInstance,
  reach: NetReach,
  timings: NetProbeTimings = NET_PROBE_TIMINGS
): Promise<NetRouteChoice> {
  const urls = probeUrls(instance);
  const lan = outcomeOf(reach(urls.lan), timings);
  const relayUrl = urls.relay;
  const relay: Promise<NetProbeOutcome> = relayUrl
    ? relayAfterHeadStart(lan, () => outcomeOf(reach(relayUrl), timings), timings)
    : Promise.resolve('absent');
  const lanOutcome = await lan;
  return chooseRoute({ lan: lanOutcome, relay: lanOutcome === 'reached' ? 'absent' : await relay });
}

export class NetRouteKeeper {
  private probing: Promise<NetRouteChoice | null> | null = null;

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

  private async measure(): Promise<NetRouteChoice | null> {
    await this.ready();
    const instance = await loadInstance();
    if (!instance) return null;
    const choice = await measureRoute(instance, this.reach);
    rememberRoute(choice.mode);
    return choice;
  }
}
