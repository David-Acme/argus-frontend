import type { RtcEvent, RtcJoin } from '@/core/types';

export interface IRealtimeCall {
  join(join: RtcJoin, listener: (event: RtcEvent) => void): Promise<void>;
  setMicrophone(enabled: boolean): Promise<void>;
  send(topic: string, payload: string): Promise<void>;
  leave(): Promise<void>;
}
