import { synchronizeService } from '@/core/services/sync';
import { SYNC_OPERATION } from '@/shared/constants';
import { readResourceNotice, resourceSignal } from './resource-signal';

let bound = false;

export function bindResourceSignal(): void {
  if (bound) return;
  bound = true;
  synchronizeService.on(SYNC_OPERATION.ResourceChanged, (message) => {
    const notice = readResourceNotice(message.info);
    if (notice) resourceSignal.changed(notice);
  });
  let missed = false;
  synchronizeService.onDisconnect(() => {
    missed = true;
  });
  synchronizeService.onConnect(() => {
    if (!missed) return;
    missed = false;
    resourceSignal.reconnected();
  });
}
