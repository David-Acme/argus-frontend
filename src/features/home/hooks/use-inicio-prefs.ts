import { viewCacheService } from '@/core/services/view-cache.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { NO_INICIO_PREFS, type InicioPrefs } from '@/features/home/model/inicio-prefs';

export type InicioPrefsState = { prefs: InicioPrefs; save: (next: InicioPrefs) => void };

const save = (next: InicioPrefs) => viewCacheService.writeValue(VIEW_CACHE_KEYS.inicioPrefs, next);

export function useInicioPrefs(): InicioPrefsState {
  const prefs = useViewCacheValue<InicioPrefs>(VIEW_CACHE_KEYS.inicioPrefs) ?? NO_INICIO_PREFS;
  return { prefs, save };
}
