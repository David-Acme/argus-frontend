import type { IServiceResponse } from '@/core/interfaces';
import { selfNameSchema } from '@/core/contracts/session.contract';
import type { SelfName } from '@/core/contracts/session.contract';
import { expectShape, httpService } from '@/core/services/http';
import { sessionService } from '@/core/services/session.service';
import { ME_ROUTE } from '@/features/auth/constants/name.constant';
import type { PersonName } from '@/features/auth/model/person-name';

export async function saveSelfName(value: PersonName): Promise<IServiceResponse<SelfName>> {
  const answer = expectShape(
    await httpService.patch(ME_ROUTE, value),
    selfNameSchema,
    'The name answer'
  );
  if (answer.info) sessionService.updateUser({ name: answer.info.name });
  return answer;
}
