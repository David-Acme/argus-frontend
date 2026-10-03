import type { NetSocketOptions } from 'argus-net';
import type { IArgusSocket } from '@/core/interfaces';
import { netService } from '@/core/services/net';

export function openSocket(options: NetSocketOptions): Promise<IArgusSocket> {
  return netService.openSocket(options);
}
