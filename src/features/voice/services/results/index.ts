import { synchronizeService } from '@/core/services/sync';
import { VOICE_RESULT_TYPE } from '@/features/voice/constants/voice';
import { ArgusResults } from '@/features/voice/services/results/argus-results';
import { voiceService } from '@/features/voice/services/voice';

export const argusResults = new ArgusResults({
  onFrame: (listener) => {
    const fromSync = synchronizeService.onType(VOICE_RESULT_TYPE, listener);
    const fromCall = voiceService.onResult(listener);
    return () => {
      fromSync();
      fromCall();
    };
  },
  now: () => Date.now(),
});
