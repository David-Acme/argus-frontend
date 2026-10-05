import type { IHeartbeatService } from '@/core/interfaces';
import { heartbeatService as heartbeatServiceImpl } from './heartbeat';

export const heartbeatService: IHeartbeatService = heartbeatServiceImpl;

export { nextNoticeCheckMs, planFor, pingIntervalMs, readPushHeartbeat, watchdogNotice } from './heartbeat-plan';
