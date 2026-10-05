import { incidentResponseListSchema, incidentResponseSchema } from '@/core/contracts/response.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import type { IncidentResponse, ResponseVerdict } from '@/core/types';

const ROUTE = '/notification/responses';

function checked<T>(
  result: IServiceResponse<unknown>,
  parse: (info: unknown) => { success: true; data: T } | { success: false }
): IServiceResponse<T> {
  if (!result.ok) return { status: result.status, ok: false, info: null, errors: result.errors };
  const parsed = parse(result.info);
  if (!parsed.success) {
    return {
      status: result.status,
      ok: false,
      info: null,
      errors: { code: 'INVALID_RESPONSE', message: 'The response has an unexpected shape' },
    };
  }
  return { status: result.status, ok: true, info: parsed.data, errors: null };
}

export const responseService = {
  async list(): Promise<IServiceResponse<IncidentResponse[]>> {
    return checked(await httpService.get<unknown>(ROUTE), (info) => incidentResponseListSchema.safeParse(info));
  },
  async decide(id: number, verdict: ResponseVerdict): Promise<IServiceResponse<IncidentResponse>> {
    return checked(await httpService.patch<unknown>(`${ROUTE}/${id}`, { verdict }), (info) =>
      incidentResponseSchema.safeParse(info)
    );
  },
};
