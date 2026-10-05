import type { IDeadmanAlarm, IHeartbeatService } from '@/core/interfaces';
import { HeartbeatEngine } from './heartbeat-engine';

const inAppOnly: IDeadmanAlarm = {
  apply: async () => undefined,
};

export const heartbeatService: IHeartbeatService = new HeartbeatEngine(inAppOnly);
