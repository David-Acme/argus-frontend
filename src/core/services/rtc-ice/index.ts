import { httpService } from '@/core/services/http';
import { RtcIceSource } from './rtc-ice';

export const rtcIceService = new RtcIceSource(
  (path) => httpService.get<unknown>(path),
  () => Math.floor(Date.now() / 1000),
);

export { RTC_ICE_MARGIN_S, RTC_ICE_ROUTE, RtcIceSource, iceCacheFresh, readIceServers } from './rtc-ice';
export type { RtcIceCache, RtcIceFetch } from './rtc-ice';
