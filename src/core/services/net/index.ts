import type { IArgusNetService } from '@/core/interfaces';
import { netService as netServiceImpl } from './net';

export const netService: IArgusNetService = netServiceImpl;

export type { IArgusNetService } from '@/core/interfaces';
export type {
  NetDiscovery,
  NetError,
  NetErrorCode,
  NetHttpFile,
  NetHttpRequest,
  NetHttpResult,
  NetMethod,
  NetPairedInstance,
  NetPairing,
} from '@/core/types';
