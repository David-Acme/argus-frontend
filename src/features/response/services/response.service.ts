import {
  incidentResponseListSchema,
  incidentResponseSchema,
} from '@/core/contracts/response.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
import type { IncidentResponse, ResponseVerdict } from '@/core/types';

const ROUTE = '/notification/responses';

export const responseService = {
  async list(): Promise<IServiceResponse<IncidentResponse[]>> {
    return expectShape(
      await httpService.get<unknown>(ROUTE),
      incidentResponseListSchema,
      'The incident response'
    );
  },
  async decide(id: number, verdict: ResponseVerdict): Promise<IServiceResponse<IncidentResponse>> {
    return expectShape(
      await httpService.patch<unknown>(`${ROUTE}/${id}`, { verdict }),
      incidentResponseSchema,
      'The incident response'
    );
  },
};
