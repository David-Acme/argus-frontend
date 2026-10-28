import { panicResultSchema, safetyStatusSchema } from '@/core/contracts/safety.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
import { needsPin, watchSafetyMemo } from '@/features/safety/services/safety-memo';
import type { PanicResult, SafetyPins, SafetyStatus } from '@/core/types';

const SAFETY = '/guard/safety';
const PIN = '/guard/safety/pin';
const PANIC = '/guard/panic';
class SafetyService {
  private known: SafetyStatus | null = null;

  async status(): Promise<IServiceResponse<SafetyStatus>> {
    return this.remember(
      expectShape(await httpService.get<unknown>(SAFETY), safetyStatusSchema, 'The safety answer')
    );
  }

  async setDuressEnabled(
    duressEnabled: boolean,
    currentPin?: string
  ): Promise<IServiceResponse<SafetyStatus>> {
    const body = currentPin === undefined ? { duressEnabled } : { duressEnabled, currentPin };
    return this.remember(
      expectShape(
        await httpService.patch<unknown>(SAFETY, body),
        safetyStatusSchema,
        'The safety answer'
      )
    );
  }

  async setPhrase(
    phrase: string | null,
    currentPin?: string
  ): Promise<IServiceResponse<SafetyStatus>> {
    const body =
      currentPin === undefined
        ? { duressEnabled: true, duressPhrase: phrase }
        : { duressEnabled: true, duressPhrase: phrase, currentPin };
    return this.remember(
      expectShape(
        await httpService.patch<unknown>(SAFETY, body),
        safetyStatusSchema,
        'The safety answer'
      )
    );
  }

  async setPins(pins: SafetyPins, currentPin?: string): Promise<IServiceResponse<SafetyStatus>> {
    const body = currentPin === undefined ? pins : { ...pins, currentPin };
    return this.remember(
      expectShape(
        await httpService.put<unknown>(PIN, body),
        safetyStatusSchema,
        'The safety answer'
      )
    );
  }

  async removePins(currentPin?: string): Promise<IServiceResponse<SafetyStatus>> {
    const body = currentPin === undefined ? undefined : { currentPin };
    return this.remember(
      expectShape(
        await httpService.delete<unknown>(PIN, body),
        safetyStatusSchema,
        'The safety answer'
      )
    );
  }

  async panic(environmentId?: number): Promise<IServiceResponse<PanicResult>> {
    const body = environmentId === undefined ? {} : { environmentId };
    return expectShape(
      await httpService.post<unknown>(PANIC, body),
      panicResultSchema,
      'The safety answer'
    );
  }

  async disarmNeedsPin(): Promise<boolean> {
    if (this.known) return needsPin(this.known, null);
    try {
      return needsPin(null, await this.status());
    } catch {
      return needsPin(null, null);
    }
  }

  forget(): void {
    this.known = null;
  }

  private remember(response: IServiceResponse<SafetyStatus>): IServiceResponse<SafetyStatus> {
    if (response.ok && response.info) this.known = response.info;
    return response;
  }
}

export const safetyService = new SafetyService();

watchSafetyMemo(safetyService);
