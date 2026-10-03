import type {
  NetAdoptInput,
  NetDiscovery,
  NetHttpRequest,
  NetHttpResult,
  NetPairInput,
  NetPairedInstance,
  NetPairing,
} from '@/core/types';
import type { NetSocketOptions } from 'argus-net';
import type { IArgusSocket } from './socket.interface';

export interface IArgusNetService {
  discover(timeoutMs?: number): Promise<NetDiscovery>;
  pair(input: NetPairInput): Promise<NetPairing>;
  adoptPairing(input: NetAdoptInput): Promise<void>;
  request(options: NetHttpRequest): Promise<NetHttpResult>;
  requestTrustAny(options: NetHttpRequest): Promise<NetHttpResult>;
  openSocket(options: NetSocketOptions): Promise<IArgusSocket>;
  refreshAddress(): Promise<boolean>;
  isPaired(): Promise<boolean>;
  instance(): Promise<NetPairedInstance | null>;
  unpair(): Promise<void>;
}
