import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { callPreferencesSchema } from '@/core/contracts/rtc.contract';
import type { CallPreferences, CallPreferencesPatch } from '@/core/types';

const ROUTE = '/notification/call-preferences';

function checked(result: IServiceResponse<unknown>): IServiceResponse<CallPreferences> {
  if (!result.ok) return { status: result.status, ok: false, info: null, errors: result.errors };
  const parsed = callPreferencesSchema.safeParse(result.info);
  if (!parsed.success) {
    return {
      status: result.status,
      ok: false,
      info: null,
      errors: {
        code: 'INVALID_RESPONSE',
        message: 'The call preferences have an unexpected shape',
      },
    };
  }
  return { status: result.status, ok: true, info: parsed.data, errors: null };
}

export const callPreferencesService = {
  async read(): Promise<IServiceResponse<CallPreferences>> {
    return checked(await httpService.get<unknown>(ROUTE));
  },
  async update(patch: CallPreferencesPatch): Promise<IServiceResponse<CallPreferences>> {
    return checked(await httpService.patch<unknown>(ROUTE, patch));
  },
};
