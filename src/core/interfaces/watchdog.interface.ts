import type { DeadmanPlan, GuardLiveness, HeartbeatPresence } from '@/core/types';

export interface IHeartbeat {
  at: number;
  intervalSeconds: number;
  graceSeconds: number;
  socketGraceSeconds: number;
  armed: boolean;
  presence: HeartbeatPresence;
  presenceSince: number;
  guard: GuardLiveness;
  guardSeenAt: number;
}

export interface IHeartbeatRecord {
  beat: IHeartbeat;
  receivedAt: number;
}

export interface IDeadmanAlarm {
  apply(plan: DeadmanPlan): Promise<void>;
}

export interface IHeartbeatService {
  start(): void;
  stop(): Promise<void>;
  receive(beat: IHeartbeat, receivedAt?: number): Promise<void>;
  checkNow(): Promise<boolean>;
  last(): IHeartbeatRecord | null;
  disconnectedAt(): number | null;
  subscribe(listener: () => void): () => void;
}
