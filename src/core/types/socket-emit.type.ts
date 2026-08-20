import { SYNC_OPERATION } from '@/shared/constants';

export type SyncOperation = (typeof SYNC_OPERATION)[keyof typeof SYNC_OPERATION];
