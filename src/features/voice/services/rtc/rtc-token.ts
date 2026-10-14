import { httpService } from '@/core/services/http';
import type { RtcDeclineAnswer, RtcDeclineRequest, RtcTokenAnswer, RtcTokenRequest } from '@/core/types';
import { readDeclineAnswer, readTokenAnswer } from '@/features/voice/model/rtc-protocol';

const RTC_TOKEN_ROUTE = '/rtc/token';
const RTC_DECLINE_ROUTE = '/rtc/decline';

export async function requestCallToken(request: RtcTokenRequest): Promise<RtcTokenAnswer> {
  return readTokenAnswer(await httpService.post<unknown>(RTC_TOKEN_ROUTE, request));
}

export async function requestCallDecline(request: RtcDeclineRequest): Promise<RtcDeclineAnswer> {
  return readDeclineAnswer(await httpService.post<unknown>(RTC_DECLINE_ROUTE, request));
}
