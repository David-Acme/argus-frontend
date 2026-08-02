import type { IStorageService } from '@/core/interfaces';
import { storageService as storageServiceImpl } from './storage';

export const storageService: IStorageService = storageServiceImpl;

export type { IStorageService } from '@/core/interfaces';
export type { StoragePrimitive } from '@/core/types';
