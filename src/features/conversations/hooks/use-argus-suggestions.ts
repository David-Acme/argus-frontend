import type { ICameraCacheRow } from '@/core/interfaces';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { cameraToSuggest, suggestionsOf } from '@/features/conversations/model/suggestions';
import type { Suggestion } from '@/features/conversations/model/suggestions';

export type SuggestionContext = { now: number; shownCamera: string | null };

export function useArgusSuggestions({ now, shownCamera }: SuggestionContext): Suggestion[] {
  const { has, cameraActions, guard } = useCapabilities();
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const names = cameraActions.watch
    ? cameras.filter((row) => row.isEnabled).map((row) => row.name)
    : [];
  return suggestionsOf({
    cameraName: cameraToSuggest(names, shownCamera),
    readsPresence: has(CAPABILITY.presenceRead),
    setsMode: guard.setMode,
    readsAgenda: has(CAPABILITY.agendaRead),
    hour: new Date(now).getHours(),
  });
}
