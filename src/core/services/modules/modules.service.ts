import {
  readModuleActionResult,
  readModuleData,
  readModuleImpact,
  readModuleRequest,
} from '@/core/contracts/modules.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
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

class ModulesService {
  async data(id: string): Promise<IServiceResponse<ModuleDataOwner[]>> {
    return expectShape(
      await httpService.get<unknown>(`${MODULE_ROUTE}/${encodeURIComponent(id)}/data`),
      readModuleData,
      'The module answer'
    );
  }

  async impact(id: string, action: ModuleImpactAction): Promise<IServiceResponse<ModuleImpact>> {
    const path = `${MODULE_ROUTE}/${encodeURIComponent(id)}/impact?action=${action}`;
    return expectShape(await httpService.get<unknown>(path), readModuleImpact, 'The module answer');
  }

  async request(id: string): Promise<IServiceResponse<ModuleRequestAnswer>> {
    return expectShape(
      await httpService.post<unknown>(`${MODULE_ROUTE}/${encodeURIComponent(id)}/request`, {}),
      readModuleRequest,
      'The module answer'
    );
  }

  async act(
    id: string,
    action: ModuleAction,
    body?: ModuleUninstall
  ): Promise<IServiceResponse<ModuleRecord | ModuleJob>> {
    const result = await httpService.post<unknown>(
      `${MODULE_ROUTE}/${encodeURIComponent(id)}/${action}`,
      body ?? {}
    );
    if (!result.ok) return { status: result.status, ok: false, info: null, errors: result.errors };
    const parsed = readModuleActionResult(result.info);
    return parsed === null
      ? { status: result.status, ok: true, info: null, errors: null }
      : { status: result.status, ok: true, info: parsed, errors: null };
  }
}

export const modulesService = new ModulesService();
