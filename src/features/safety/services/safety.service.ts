import { panicResultSchema, safetyStatusSchema } from '@/core/contracts/safety.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type { PanicResult, SafetyPins, SafetyStatus } from '@/core/types';
import type { z } from 'zod';

const SAFETY = '/guard/safety';
const PIN = '/guard/safety/pin';
const PANIC = '/guard/panic';

function parsed<T>(response: IServiceResponse<unknown>, schema: z.ZodType<T>): IServiceResponse<T> {
  if (!response.ok) return { ...response, info: null };
  const result = schema.safeParse(response.info);
  if (!result.success) {
    return errorResponse(response.status, 'INVALID_RESPONSE', 'The safety answer is not in the expected shape');
  }
  return { ...response, info: result.data };
}

class SafetyService {
  private known: SafetyStatus | null = null;

  async status(): Promise<IServiceResponse<SafetyStatus>> {
    return this.remember(parsed(await httpService.get<unknown>(SAFETY), safetyStatusSchema));
  }

  async setDuressEnabled(duressEnabled: boolean, currentPin?: string): Promise<IServiceResponse<SafetyStatus>> {
    const body = currentPin === undefined ? { duressEnabled } : { duressEnabled, currentPin };
    return this.remember(parsed(await httpService.patch<unknown>(SAFETY, body), safetyStatusSchema));
  }

  async setPins(pins: SafetyPins, currentPin?: string): Promise<IServiceResponse<SafetyStatus>> {
    const body = currentPin === undefined ? pins : { ...pins, currentPin };
    return this.remember(parsed(await httpService.put<unknown>(PIN, body), safetyStatusSchema));
  }

  async removePins(currentPin?: string): Promise<IServiceResponse<SafetyStatus>> {
    const body = currentPin === undefined ? undefined : { currentPin };
    return this.remember(parsed(await httpService.delete<unknown>(PIN, body), safetyStatusSchema));
  }

  async panic(environmentId?: number): Promise<IServiceResponse<PanicResult>> {
    const body = environmentId === undefined ? {} : { environmentId };
    return parsed(await httpService.post<unknown>(PANIC, body), panicResultSchema);
  }

  async disarmNeedsPin(): Promise<boolean> {
    if (this.known) return this.known.hasPin;
    const answer = await this.status();
    return answer.info?.hasPin ?? false;
  }

  private remember(response: IServiceResponse<SafetyStatus>): IServiceResponse<SafetyStatus> {
    if (response.ok && response.info) this.known = response.info;
    return response;
  }
}

export const safetyService = new SafetyService();
