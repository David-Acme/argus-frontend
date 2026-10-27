import { viewCacheService } from '@/core/services/view-cache.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { BAR_PINS, NO_PINS, togglePin, type NavPins } from '@/features/navigation/model/nav-model';

const QUICK_LIMIT = 12;

export type NavPinsState = NavPins & {
  toggleBar: (module: string) => void;
  toggleQuick: (module: string) => void;
};

function save(next: NavPins): void {
  viewCacheService.writeValue(VIEW_CACHE_KEYS.navPins, next);
}

export function useNavPins(): NavPinsState {
  const pins = useViewCacheValue<NavPins>(VIEW_CACHE_KEYS.navPins) ?? NO_PINS;
  return {
    ...pins,
    toggleBar: (module) => save({ ...pins, bar: togglePin(pins.bar, module, BAR_PINS) }),
    toggleQuick: (module) => save({ ...pins, quick: togglePin(pins.quick, module, QUICK_LIMIT) }),
  };
}
