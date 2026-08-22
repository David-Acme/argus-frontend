import type {
  NetDiscovery,
  NetHttpRequest,
  NetHttpResult,
  NetPairedInstance,
  NetPairing,
} from '@/core/types';
import type { NetSocketOptions } from 'argus-net';
import type { IArgusSocket } from './socket.interface';

export interface IArgusNetService {
  discover(timeoutMs?: number): Promise<NetDiscovery>;
  pair(host: string, ip: string, port: number, code: string): Promise<NetPairing>;
  request(options: NetHttpRequest): Promise<NetHttpResult>;
  /** Pre-pairing (TOFU): TLS trust-any, no stored instance. Only /invite/accept. */
  requestTrustAny(options: NetHttpRequest): Promise<NetHttpResult>;
  /** Opens a WebSocket over the paired strict-TLS client (same CA as HTTP). */
  openSocket(options: NetSocketOptions): Promise<IArgusSocket>;
  /**
   * Looks the paired server up again and re-points the instance at it.
   * `true` when the address changed. The socket reports its failures through
   * its own handler, so the reconnect path has to ask for this explicitly.
   */
  refreshAddress(): Promise<boolean>;
  isPaired(): Promise<boolean>;
  instance(): Promise<NetPairedInstance | null>;
  unpair(): Promise<void>;
}
