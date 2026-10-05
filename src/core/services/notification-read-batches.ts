import { NOTIFICATION_READ_BATCH_SIZE } from '@/shared/constants';

export function readBatches(ids: readonly string[], size: number = NOTIFICATION_READ_BATCH_SIZE): number[][] {
  const numeric = [...new Set(ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
  const batches: number[][] = [];
  for (let start = 0; start < numeric.length; start += size) {
    batches.push(numeric.slice(start, start + size));
  }
  return batches;
}
