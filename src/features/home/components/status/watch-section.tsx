import type { ICameraCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { useGuardEnvironments, useGuardHeadline } from '@/features/security';
import { namesText } from '@/features/home/model/inicio-hero';
import {
  wakeRuleOf,
  watchedCameras,
  watchTitleOf,
  type WatchSummary,
} from '@/features/home/model/inicio-watch';

const SHOWN = 3;

const TITLE_KEYS = {
  tonight: 'screens.home.inicio.watch.tonight',
  away: 'screens.home.inicio.watch.away',
} as const;

const WAKE_TITLE_KEYS = {
  tonight: 'screens.home.inicio.watch.wake-night',
  away: 'screens.home.inicio.watch.wake-away',
} as const;

const WAKE_KEYS = {
  unknown: 'screens.home.inicio.watch.unknown',
  insists: 'screens.home.inicio.watch.insists',
  danger: 'screens.home.inicio.watch.danger',
} as const;

function useWatched(enabled: boolean): WatchSummary | null {
  const environments = useGuardEnvironments(enabled).data;
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  if (!enabled) return null;
  return watchedCameras({
    environments: environments ?? [],
    cameras: cameras.map(({ id, name }) => ({ id, name })),
    shown: SHOWN,
  });
}

export function WatchSection() {
  const { t } = useTranslation();
  const { guard } = useCapabilities();
  const mode = useGuardHeadline();
  const watched = useWatched(guard.view);
  const title = watchTitleOf(mode);
  const wake = wakeRuleOf(mode);
  if (!title || !wake || !watched) return null;
  const names = watched.more > 0 ? watched.names.join(', ') : namesText(watched.names, t);
  return (
    <Section title={t(TITLE_KEYS[title])}>
      <Row
        leading={<Avatar icon="door" />}
        title={
          watched.count === 1
            ? t('screens.home.inicio.watch.cameras-one')
            : t('screens.home.inicio.watch.cameras', { count: String(watched.count) })
        }
        meta={
          watched.more > 0
            ? t('screens.home.inicio.watch.more', { names, count: String(watched.more) })
            : names
        }
      />
      <Row
        leading={<Avatar icon="bell" />}
        title={t(WAKE_TITLE_KEYS[title])}
        meta={t(WAKE_KEYS[wake])}
      />
    </Section>
  );
}
