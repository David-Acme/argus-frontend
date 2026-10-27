import type { ICameraCacheRow } from '@/core/interfaces';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { suggestionsOf } from '@/features/conversations/model/suggestions';
import type { Suggestion } from '@/features/conversations/model/suggestions';

export function useArgusSuggestions(now: number): Suggestion[] {
  const { has, cameraActions, guard } = useCapabilities();
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const camera = cameraActions.watch ? cameras.find((row) => row.isEnabled) : undefined;
  return suggestionsOf({
    cameraName: camera?.name ?? null,
    readsPresence: has(CAPABILITY.presenceRead),
    setsMode: guard.setMode,
    readsAgenda: has(CAPABILITY.agendaRead),
    hour: new Date(now).getHours(),
  });
}
