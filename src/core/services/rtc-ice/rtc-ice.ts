import type { IServiceResponse } from '@/core/interfaces';
import type { RtcIceServer } from '@/core/types';
import { rtcIceGrantSchema } from '@/core/contracts/rtc.contract';

export const RTC_ICE_ROUTE = '/rtc/ice';

export const RTC_ICE_MARGIN_S = 60;

export type RtcIceFetch = (path: string) => Promise<IServiceResponse<unknown>>;

export type RtcIceCache = {
  servers: RtcIceServer[];
  expiresAt: number;
};

export function readIceServers(result: IServiceResponse<unknown>): RtcIceCache {
  if (!result.ok) return { servers: [], expiresAt: 0 };
  const parsed = rtcIceGrantSchema.safeParse(result.info);
  if (!parsed.success) return { servers: [], expiresAt: 0 };
  return { servers: parsed.data.iceServers, expiresAt: parsed.data.expiresAt };
}

export function iceCacheFresh(cache: RtcIceCache | null, nowS: number): cache is RtcIceCache {
  return cache !== null && cache.servers.length > 0 && cache.expiresAt - RTC_ICE_MARGIN_S > nowS;
}

export class RtcIceSource {
  private cache: RtcIceCache | null = null;

  constructor(
    private readonly fetch: RtcIceFetch,
    private readonly nowS: () => number,
  ) {}

  async servers(): Promise<RtcIceServer[]> {
    if (iceCacheFresh(this.cache, this.nowS())) return this.cache.servers;
    try {
      this.cache = readIceServers(await this.fetch(RTC_ICE_ROUTE));
    } catch {
      this.cache = null;
      return [];
    }
    return this.cache.servers;
  }

  forget(): void {
    this.cache = null;
  }
}
