import type { NetSocketOptions } from 'argus-net';
import type { IArgusSocket } from '@/core/interfaces';
import { netService } from '@/core/services/net';

/** Opens the WS over the paired strict-TLS client (same CA/instance as HTTP). */
export function openSocket(options: NetSocketOptions): Promise<IArgusSocket> {
  return netService.openSocket(options);
}
