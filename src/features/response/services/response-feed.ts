import { readIncidentResponse } from '@/core/contracts/response.contract';
import { synchronizeService } from '@/core/services/sync';
import { SYNC_OPERATION } from '@/shared/constants';
import { useResponseStore } from '@/features/response/stores/response.store';

let bound = false;

export function bindResponseFeed(): void {
  if (bound) return;
  bound = true;
  synchronizeService.on(SYNC_OPERATION.ResponseUpdate, (message) => {
    const response = readIncidentResponse(message.info);
    if (response) useResponseStore.getState().apply(response);
  });
}
