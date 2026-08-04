import type { ISecureStorageService } from '@/core/interfaces';
import { secureStorageService as secureStorageServiceImpl } from './secure-storage';

export const secureStorageService: ISecureStorageService = secureStorageServiceImpl;

export type { ISecureStorageService } from '@/core/interfaces';
