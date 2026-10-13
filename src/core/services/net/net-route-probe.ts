import { NET_ROUTE_PROBE_TIMEOUT_MS } from '@/shared/constants';
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

function outcomeOf(attempt: Promise<unknown>, timeoutMs: number): Promise<NetProbeOutcome> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('failed'), timeoutMs);
    attempt.then(
      () => {
        clearTimeout(timer);
        resolve('reached');
      },
      () => {
        clearTimeout(timer);
        resolve('failed');
      }
    );
  });
}

export async function measureRoute(
  instance: NetPairedInstance,
  reach: NetReach,
  timeoutMs: number = NET_ROUTE_PROBE_TIMEOUT_MS
): Promise<NetRouteChoice> {
  const urls = probeUrls(instance);
  const relay: Promise<NetProbeOutcome> = urls.relay
    ? outcomeOf(reach(urls.relay), timeoutMs)
    : Promise.resolve('absent');
  const lan = await outcomeOf(reach(urls.lan), timeoutMs);
  return chooseRoute({ lan, relay: lan === 'reached' ? 'absent' : await relay });
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
