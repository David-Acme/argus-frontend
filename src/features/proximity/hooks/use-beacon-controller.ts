import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { beaconService } from '@/core/services/beacon';
import { heartbeatService } from '@/core/services/heartbeat';
import type { ProximityMe } from '@/core/types';
import { IS_ANDROID, IS_IOS, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useProximityMe } from '@/features/proximity/hooks/use-proximity-me';
import { beaconPlan, type BeaconPlan, type BeaconPlatform, type BeaconPresence } from '@/features/proximity/model/proximity';

const PLATFORM: BeaconPlatform = IS_ANDROID ? 'android' : IS_IOS ? 'ios' : 'none';

const subscribePresence = (listener: () => void) => heartbeatService.subscribe(listener);

const presenceNow = (): BeaconPresence | null => heartbeatService.last()?.beat.presence ?? null;

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return active;
}

export function useBeaconPlan(me: ProximityMe | null): BeaconPlan {
  const presence = useSyncExternalStore(subscribePresence, presenceNow, presenceNow);
  const appActive = useAppActive();
  return useMemo(
    () =>
      beaconPlan({
        platform: PLATFORM,
        me,
        presence,
        appActive,
        supported: PLATFORM !== 'none' && beaconService.supported(),
        permitted: PLATFORM !== 'none' && beaconService.permissionGranted(),
      }),
    [appActive, me, presence]
  );
}

export function useBeaconController(): void {
  const { t } = useTranslation();
  const { enabled } = useProximityMe();
  const me = useViewCacheValue<ProximityMe>(VIEW_CACHE_KEYS.proximityMe);
  const plan = useBeaconPlan(enabled ? me : null);
  const seed = me?.ble.seed ?? null;
  const rotateSeconds = me?.ble.rotateSeconds ?? 0;
  const title = t('screens.proximity.ble.notification-title');
  const detail = t('screens.proximity.ble.notification-detail');

  useEffect(() => {
    if (PLATFORM === 'none') return;
    if (!plan.advertise || seed === null) {
      if (beaconService.running()) beaconService.stop();
      return;
    }
    void beaconService.start({ seed, rotateSeconds, title, detail });
  }, [detail, plan.advertise, rotateSeconds, seed, title]);

  useEffect(
    () => () => {
      if (PLATFORM !== 'none') beaconService.stop();
    },
    []
  );
}
