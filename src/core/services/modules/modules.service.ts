import { readModuleActionResult, readModuleData, readModuleImpact, readModuleRequest } from '@/core/contracts/modules.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import type {
  ModuleAction,
  ModuleDataOwner,
  ModuleImpact,
  ModuleImpactAction,
  ModuleJob,
  ModuleRecord,
  ModuleRequestAnswer,
  ModuleUninstall,
} from '@/core/types';
import { MODULE_ROUTE } from '@/shared/constants';

const invalid = (status: number): IServiceResponse<never> => ({
  status,
  ok: false,
  info: null,
  errors: { code: 'INVALID_RESPONSE', message: 'The response has an unexpected shape' },
});

function checked<T>(result: IServiceResponse<unknown>, read: (info: unknown) => T | null): IServiceResponse<T> {
  if (!result.ok) return { status: result.status, ok: false, info: null, errors: result.errors };
  const parsed = read(result.info);
  return parsed === null ? invalid(result.status) : { status: result.status, ok: true, info: parsed, errors: null };
}

class ModulesService {
  async data(id: string): Promise<IServiceResponse<ModuleDataOwner[]>> {
    return checked(await httpService.get<unknown>(`${MODULE_ROUTE}/${encodeURIComponent(id)}/data`), readModuleData);
  }

  async impact(id: string, action: ModuleImpactAction): Promise<IServiceResponse<ModuleImpact>> {
    const path = `${MODULE_ROUTE}/${encodeURIComponent(id)}/impact?action=${action}`;
    return checked(await httpService.get<unknown>(path), readModuleImpact);
  }

  async request(id: string): Promise<IServiceResponse<ModuleRequestAnswer>> {
    return checked(await httpService.post<unknown>(`${MODULE_ROUTE}/${encodeURIComponent(id)}/request`, {}), readModuleRequest);
  }

  async act(
    id: string,
    action: ModuleAction,
    body?: ModuleUninstall
  ): Promise<IServiceResponse<ModuleRecord | ModuleJob>> {
    const result = await httpService.post<unknown>(`${MODULE_ROUTE}/${encodeURIComponent(id)}/${action}`, body ?? {});
    if (!result.ok) return { status: result.status, ok: false, info: null, errors: result.errors };
    const parsed = readModuleActionResult(result.info);
    return parsed === null
      ? { status: result.status, ok: true, info: null, errors: null }
      : { status: result.status, ok: true, info: parsed, errors: null };
  }
}

export const modulesService = new ModulesService();
