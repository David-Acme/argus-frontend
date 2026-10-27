import { synchronizeService } from '@/core/services/sync';
import { ArgusResults } from '@/features/voice/services/results/argus-results';

export const argusResults = new ArgusResults({
  onType: (type, listener) => synchronizeService.onType(type, listener),
  now: () => Date.now(),
});
