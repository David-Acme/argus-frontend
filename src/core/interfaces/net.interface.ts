import type {
  NetDiscovery,
  NetHttpRequest,
  NetHttpResult,
  NetPairedInstance,
  NetPairing,
} from '@/core/types';

export interface IArgusNetService {
  discover(timeoutMs?: number): Promise<NetDiscovery>;
  pair(host: string, ip: string, port: number, code: string): Promise<NetPairing>;
  request(options: NetHttpRequest): Promise<NetHttpResult>;
  isPaired(): Promise<boolean>;
  instance(): Promise<NetPairedInstance | null>;
  unpair(): Promise<void>;
}
