import type { NetSocketOptions } from 'argus-net';
import type { IArgusSocket } from '@/core/interfaces';
import { netService } from '@/core/services/net';

/** Opens the strict-TLS Tauri socket through the desktop Rust transport. */
export function openSocket(options: NetSocketOptions): Promise<IArgusSocket> {
  return netService.openSocket(options);
}
