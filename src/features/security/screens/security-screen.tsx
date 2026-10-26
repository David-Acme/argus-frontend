import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { GuardEpisode } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size, useFourColumns, useWindowLayout } from '@/shared/theme';
import { Notice } from '@/shared/ui/notice';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { Status } from '@/shared/ui/status';
import { CameraForm } from '@/features/cameras';
import { SosButton } from '@/features/safety';
import {
  ActivitySection,
  MaintenanceSection,
  PlacesSection,
  VisitsSection,
} from '@/features/security/components/page/aside-sections';
import { CamerasSection } from '@/features/security/components/page/cameras-section';
import { EpisodeSheet } from '@/features/security/components/page/episode-sheet';
import { HappenedSection } from '@/features/security/components/page/happened-section';
import { ModeControl } from '@/features/security/components/page/mode-control';
import { MoreSection } from '@/features/security/components/page/more-section';
import { PlacePicker } from '@/features/security/components/page/place-picker';
import { PromiseSection, TrySection } from '@/features/security/components/page/starter-sections';
import { useSecurity } from '@/features/security/hooks/use-security';
import { useCameraTiles } from '@/features/security/hooks/use-security-cameras';
import { episodeKey } from '@/features/security/model/episode';
import {
  HAPPENED_COLUMN,
  HAPPENED_COLUMN_WIDE,
  HAPPENED_PHONE,
} from '@/features/security/model/happened';
import { placeTitle } from '@/features/security/model/places';
import { statusStats, statusWords } from '@/features/security/model/security-status';
import { starters } from '@/features/security/model/starters';

type Security = ReturnType<typeof useSecurity>;

type LayoutProps = {
  security: Security;
  cameras: ReturnType<typeof useCameraTiles>;
  onOpen: (episode: GuardEpisode) => void;
  onConnect: () => void;
};

type PickerProps = { security: Security };

function Picker({ security }: PickerProps) {
  const { t } = useTranslation();
  if (!security.scope.several) return null;
  return (
    <PlacePicker
      title={placeTitle(security.scope, t)}
      environments={security.environments}
      current={security.scope.place}
      onPick={security.pick}
    />
  );
}

function AlertCard({ security, onOpen }: Pick<LayoutProps, 'security' | 'onOpen'>) {
  const { t } = useTranslation();
  const router = useRouter();
  const alert = security.status.alert;
  if (!alert) return null;
  return (
    <Status
      variant="card"
      tone="alert"
      primary={{
        label: t('screens.security.hero.see-camera'),
        onPress: () => router.push(`/cameras/${alert.cameraId}`),
      }}
      secondaryAction={{
        label: t('screens.security.happened.review'),
        onPress: () => onOpen(alert),
      }}
    />
  );
}

function startersOf(security: Security, cameras: LayoutProps['cameras']) {
  return starters({
    cameras: cameras.visible ? cameras.tiles.length : Number.POSITIVE_INFINITY,
    feed: security.episodes.status,
    episodes: security.episodes.rows.length,
  });
}

function nightOf(security: Security) {
  const change = security.changeMode;
  if (!change || security.selectedMode === 'night') return undefined;
  return () => void change('night');
}

function PhoneLayout({ security, cameras, onOpen, onConnect }: LayoutProps) {
  const { t } = useTranslation();
  const start = startersOf(security, cameras);
  const words = statusWords(security.status, t);
  return (
    <>
      <View className="items-start">
        <Picker security={security} />
      </View>
      <Status
        tone={security.status.tone}
        sentence={words.sentence}
        meta={words.meta}
        stats={statusStats(security.status.counts, t, 'phone')}
        presence={security.status.presence}
        presenceEvent={security.cue}
        dense
      />
      <View className="mt-3">
        <ModeControl value={security.selectedMode} onChange={security.changeMode} />
      </View>
      <AlertCard security={security} onOpen={onOpen} />
      <CamerasSection cameras={cameras} desktop={false} onConnect={onConnect} />
      {start.promise ? <PromiseSection /> : null}
      <HappenedSection
        feed={security.episodes}
        limit={HAPPENED_PHONE}
        feedForm={false}
        onOpen={onOpen}
      />
      {start.suggest ? <TrySection onNight={nightOf(security)} /> : null}
      <MoreSection guests={security.guests.list} environments={security.environments} />
    </>
  );
}

function DesktopLayout({ security, cameras, onOpen, onConnect }: LayoutProps) {
  const { t } = useTranslation();
  const four = useFourColumns();
  const words = statusWords(security.status, t);
  const start = startersOf(security, cameras);
  const band: ReactNode = (
    <>
      <Picker security={security} />
      <View className={four ? 'w-mode-band-wide' : 'w-mode-band'}>
        <ModeControl value={security.selectedMode} onChange={security.changeMode} />
      </View>
      <SosButton band environmentId={security.scope.place?.id} />
    </>
  );
  return (
    <>
      <Status
        tone={security.status.tone}
        sentence={words.sentence}
        meta={words.meta}
        stats={statusStats(security.status.counts, t, four ? 'band-wide' : 'band')}
        presence={security.status.presence}
        presenceEvent={security.cue}
        action={band}
      />
      <ScreenColumns>
        <ScreenColumn
          label={t('screens.security.camera-grid.title')}
          grows={start.promise ? false : 0}>
          <CamerasSection cameras={cameras} desktop onConnect={onConnect} />
          {start.promise ? <PromiseSection /> : null}
        </ScreenColumn>
        <ScreenColumn
          label={t('screens.security.happened.title')}
          width={four ? size.columnFeedWide : size.columnFeed}
          grows={false}>
          <AlertCard security={security} onOpen={onOpen} />
          <HappenedSection
            feed={security.episodes}
            limit={four ? HAPPENED_COLUMN_WIDE : HAPPENED_COLUMN}
            feedForm
            onOpen={onOpen}
          />
          {start.suggest ? <TrySection onNight={nightOf(security)} /> : null}
          {four ? null : <VisitsSection guests={security.guests.list} now={security.now} />}
          {four ? null : (
            <MoreSection
              guests={security.guests.list}
              environments={security.environments}
              without="visits"
            />
          )}
        </ScreenColumn>
        {four ? (
          <ScreenColumn
            label={t('screens.security.more.title')}
            width={size.columnAsideWide}
            grows={false}>
            <VisitsSection guests={security.guests.list} now={security.now} />
            <PlacesSection environments={security.environments} />
            <MaintenanceSection now={security.now} />
            <ActivitySection cameras={cameras} />
          </ScreenColumn>
        ) : null}
      </ScreenColumns>
    </>
  );
}

export default function SecurityScreen() {
  const { t } = useTranslation();
  const { windowClass } = useWindowLayout();
  const security = useSecurity();
  const cameras = useCameraTiles({
    place: security.scope.place,
    environments: security.environments,
  });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const desktop = windowClass === 'expanded' || windowClass === 'wide';
  const episode = security.episodes.rows.find((row) => episodeKey(row) === openKey) ?? null;
  const layout = {
    security,
    cameras,
    onOpen: (next: GuardEpisode) => setOpenKey(episodeKey(next)),
    onConnect: () => setConnecting(true),
  };
  const body = security.failed ? (
    <Notice
      tone="attention"
      icon="wifioff"
      title={t('screens.security.load-error')}
      action={{ label: t('common.retry'), onPress: security.reload }}
    />
  ) : desktop ? (
    <DesktopLayout {...layout} />
  ) : (
    <PhoneLayout {...layout} />
  );
  return (
    <>
      <Screen
        title={desktop ? undefined : t('screens.security.title')}
        actions={desktop ? undefined : <SosButton environmentId={security.scope.place?.id} />}
        aura={desktop ? undefined : security.status.aura}
        columns>
        {body}
      </Screen>
      <EpisodeSheet
        episode={episode}
        where={episode?.cameraName ?? ''}
        actions={security.episodes}
        onClose={() => setOpenKey(null)}
      />
      {connecting ? <CameraForm open onOpenChange={setConnecting} /> : null}
    </>
  );
}
