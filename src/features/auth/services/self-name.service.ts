import type { IServiceResponse } from '@/core/interfaces';
import { selfNameSchema } from '@/core/contracts/session.contract';
import type { SelfName } from '@/core/contracts/session.contract';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import { sessionService } from '@/core/services/session.service';
import { ME_ROUTE } from '@/features/auth/constants/name.constant';
import type { PersonName } from '@/features/auth/model/person-name';

function readSelfName(response: IServiceResponse<unknown>): IServiceResponse<SelfName> {
  if (!response.ok) return { ...response, info: null };
  const result = selfNameSchema.safeParse(response.info);
  if (!result.success)
    return errorResponse(
      response.status,
      'INVALID_RESPONSE',
      'The name answer is not in the expected shape'
    );
  return { ...response, info: result.data };
}

export async function saveSelfName(value: PersonName): Promise<IServiceResponse<SelfName>> {
  const answer = readSelfName(await httpService.patch(ME_ROUTE, value));
  if (answer.info) sessionService.updateUser({ name: answer.info.name });
  return answer;
}
