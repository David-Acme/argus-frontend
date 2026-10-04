import { httpService } from '@/core/services/http';
import type { RtcTokenAnswer, RtcTokenRequest } from '@/core/types';
import { readTokenAnswer } from '@/features/voice/model/rtc-protocol';

const RTC_TOKEN_ROUTE = '/rtc/token';

export async function requestCallToken(request: RtcTokenRequest): Promise<RtcTokenAnswer> {
  return readTokenAnswer(await httpService.post<unknown>(RTC_TOKEN_ROUTE, request));
}
