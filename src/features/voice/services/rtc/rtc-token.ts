import { httpService } from '@/core/services/http';
import type { RtcDeclineAnswer, RtcDeclineRequest, RtcTokenAnswer, RtcTokenRequest } from '@/core/types';
import { readDeclineAnswer, readTokenAnswer } from '@/features/voice/model/rtc-protocol';
import { withTimeout } from '@/features/voice/model/with-timeout';

const RTC_TOKEN_ROUTE = '/rtc/token';
const RTC_DECLINE_ROUTE = '/rtc/decline';

export const RTC_TOKEN_TIMEOUT_MS = 15_000;

export async function requestCallToken(
  request: RtcTokenRequest,
  timeoutMs: number = RTC_TOKEN_TIMEOUT_MS,
): Promise<RtcTokenAnswer> {
  return readTokenAnswer(
    await withTimeout(httpService.post<unknown>(RTC_TOKEN_ROUTE, request), timeoutMs),
  );
}

export async function requestCallDecline(request: RtcDeclineRequest): Promise<RtcDeclineAnswer> {
  return readDeclineAnswer(await httpService.post<unknown>(RTC_DECLINE_ROUTE, request));
}
