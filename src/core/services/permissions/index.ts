import type { IPermissionsService } from '@/core/interfaces';
import { permissionsService as permissionsServiceImpl } from './permissions';

export const permissionsService: IPermissionsService = permissionsServiceImpl;
