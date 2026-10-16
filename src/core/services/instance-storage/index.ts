import type { IInstanceStorageService } from '@/core/interfaces';
import { instanceStorageService as instanceStorageServiceImpl } from './instance-storage';

export const instanceStorageService: IInstanceStorageService = instanceStorageServiceImpl;

export type { IInstanceStorageService } from '@/core/interfaces';
