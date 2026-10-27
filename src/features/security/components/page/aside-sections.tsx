import { useRouter } from 'expo-router';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEnvironment, GuardExpectedGuest } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Chip } from '@/shared/ui/chip';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { objectLabelKey } from '@/features/cameras';
import { PLACE_GLYPH } from '@/features/security/constants/security.constant';
import { useMaintenance } from '@/features/security/hooks/use-maintenance';
import { useMomentFormat } from '@/features/security/hooks/use-moment-format';
import type { CameraTiles } from '@/features/security/hooks/use-security-cameras';
import { activityToday } from '@/features/security/model/camera-activity';
import { camerasIn } from '@/features/security/model/environments';
import { cameraNames, minutesLeft } from '@/features/security/model/maintenance';
import { activeGuests } from '@/features/security/model/more-rows';
import { placeMeta } from '@/features/security/model/places';
import { visitMeta } from '@/features/security/model/visits';

type VisitsProps = { guests: readonly GuardExpectedGuest[]; now: number };

type PlacesProps = { environments: readonly GuardEnvironment[] };

type ActivityProps = { cameras: CameraTiles };

type MaintenanceProps = { now: number };

export function VisitsSection({ guests, now }: VisitsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useMomentFormat();
  const active = activeGuests(guests, now);
  const open = () => router.push('/security/visits');
  return (
    <Section title={t('screens.security.more.visits')}>
      {active.length === 0 ? (
        <Row
          leading={<Avatar icon="door" />}
          title={t('screens.security.more.visits-none')}
          meta={t('screens.security.more.visits-none-detail')}
          chevron
          onPress={open}
        />
      ) : (
        active.map((guest) => (
          <Row
            key={guest.id}
            leading={<Avatar icon="door" />}
            title={guest.description}
            meta={visitMeta(guest, now, format)}
            onPress={open}
          />
        ))
      )}
    </Section>
  );
}

export function PlacesSection({ environments }: PlacesProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  return (
    <Section title={t('screens.security.places')}>
      {environments.map((environment) => (
        <Row
          key={environment.id}
          leading={<Avatar icon={PLACE_GLYPH[environment.kind]} />}
          title={environment.name}
          meta={placeMeta(environment, camerasIn(environment, environments, cameras).length, t)}
          chevron
          onPress={() => router.push(`/security/${environment.id}`)}
        />
      ))}
    </Section>
  );
}

export function MaintenanceSection({ now }: MaintenanceProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useMomentFormat();
  const { guard } = useCapabilities();
  const maintenance = useMaintenance(guard.maintenance);
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const names = new Map(cameras.map((camera) => [Number(camera.id), camera.name]));
  const active = maintenance.windows.filter((window) => window.active);
  const nowSeconds = Math.floor(now / 1000);
  const openMaintenance = () => router.push('/security/maintenance');
  if (!guard.maintenance || active.length === 0) return null;
  return (
    <Section title={t('screens.security.more.maintenance')}>
      {active.map((window) => (
        <Row
          key={window.id}
          leading={<Avatar icon="sliders" />}
          title={cameraNames(window, names).join(', ')}
          meta={t('screens.security.maintenance.active-until', {
            time: format.time(new Date(window.endsAt * 1000)),
            minutes: String(minutesLeft(window, nowSeconds)),
          })}
          onPress={openMaintenance}
        />
      ))}
    </Section>
  );
}

export function ActivitySection({ cameras }: ActivityProps) {
  const { t } = useTranslation();
  const rows = activityToday(cameras.tiles, {
    events: cameras.events,
    now: cameras.now,
    t,
    time: cameras.format.time,
    what: (label) => t(objectLabelKey(label)),
  });
  if (!cameras.visible || rows.length === 0) return null;
  return (
    <Section title={t('screens.security.activity.title')}>
      {rows.map((row) => (
        <Row
          key={row.id}
          leading={<Avatar icon="cam" />}
          title={row.name}
          meta={row.meta}
          trailing={<Chip label={String(row.count)} />}
        />
      ))}
    </Section>
  );
}
