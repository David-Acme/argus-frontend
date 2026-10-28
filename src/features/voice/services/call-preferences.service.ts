import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
import { callPreferencesSchema } from '@/core/contracts/rtc.contract';
import type { CallPreferences, CallPreferencesPatch } from '@/core/types';

const ROUTE = '/notification/call-preferences';

export const callPreferencesService = {
  async read(): Promise<IServiceResponse<CallPreferences>> {
    return expectShape(
      await httpService.get<unknown>(ROUTE),
      callPreferencesSchema,
      'The call preferences'
    );
  },
  async update(patch: CallPreferencesPatch): Promise<IServiceResponse<CallPreferences>> {
    return expectShape(
      await httpService.patch<unknown>(ROUTE, patch),
      callPreferencesSchema,
      'The call preferences'
    );
  },
};
