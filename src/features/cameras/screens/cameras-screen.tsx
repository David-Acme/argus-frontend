import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { storageService } from '@/core/services/storage';
import { CameraCardGrid } from '@/features/cameras/components/camera-card-grid';
import { CameraForm } from '@/features/cameras/components/camera-form';
import { CameraSummary, type CameraSummaryCounts } from '@/features/cameras/components/camera-summary';
import { CameraToolbar } from '@/features/cameras/components/camera-toolbar';
import { RecentDetections } from '@/features/cameras/components/recent-detections';
import {
  CAMERA_DENSITY_STORAGE_KEY,
  CAMERA_LIVE_PREVIEWS_COMPACT,
  CAMERA_LIVE_PREVIEWS_WIDE,
} from '@/features/cameras/constants';
import { useCameraCatalog } from '@/features/cameras/hooks/use-camera-catalog';
import { useCameraOverview } from '@/features/cameras/hooks/use-camera-overview';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { useCameraThumbnails } from '@/features/cameras/hooks/use-camera-thumbnails';
import { findCatalogModel, formFactorOf } from '@/features/cameras/model/camera-catalog';
import {
  cameraViews,
  countViews,
  healthOf,
  livePreviewIds,
  selectViews,
  type CameraDensity,
  type CameraSort,
  type CameraStatusFilter,
} from '@/features/cameras/model/camera-overview';
import { healthNeedsAttention } from '@/features/cameras/model/camera-status';
import { useCameraEnvironmentIndex } from '@/features/security';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY, SCREEN_TITLE_KEYS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';

const RAIL_WIDTH = 320;
const CLOCK_TICK_MS = 30000;

function readDensity(): CameraDensity {
  try {
    return storageService.getString(CAMERA_DENSITY_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export default function CamerasScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isCompact, isExpanded } = useWindowClass();
  const { can, has } = useCapabilities();
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CameraStatusFilter>('all');
  const [sort, setSort] = useState<CameraSort>('name');
  const [density, setDensity] = useState<CameraDensity>(readDensity);
  const [now, setNow] = useState(Date.now);

  const { cameras, isPendingCamera } = useCameraRows();
  const overview = useCameraOverview();
  const { models } = useCameraCatalog();
  const thumbnails = useCameraThumbnails(cameras);
  const environments = useCameraEnvironmentIndex();
  const canCreate = can('camera', 'create');
  const canTalk = has(CAPABILITY.cameraTalk);
  const readsEvents = can('event', 'read');

  const views = useMemo(() => cameraViews(cameras, overview), [cameras, overview]);
  const counts = useMemo(() => countViews(views), [views]);
  const visible = useMemo(() => selectViews(views, { query, status, sort }), [query, sort, status, views]);
  const livePreviews = useMemo(
    () =>
      livePreviewIds(visible, {
        budget: isCompact ? CAMERA_LIVE_PREVIEWS_COMPACT : CAMERA_LIVE_PREVIEWS_WIDE,
        isPending: isPendingCamera,
      }),
    [isCompact, isPendingCamera, visible],
  );
  const cameraNames = useMemo(() => new Map(cameras.map((camera) => [camera.id, camera.name])), [cameras]);
  const summary = useMemo<CameraSummaryCounts>(() => {
    const next: CameraSummaryCounts = {
      total: views.length,
      online: counts.online,
      offline: counts.offline,
      disabled: counts.disabled,
      zones: 0,
      events: 0,
      continuous: 0,
      detectionsToday: 0,
      watching: 0,
      attention: 0,
    };
    const startOfToday = new Date(now).setHours(0, 0, 0, 0);
    for (const view of views) {
      next.zones += view.camera.zones.length;
      next[view.camera.recordMode] += 1;
      next.watching += view.live?.viewers ?? 0;
      if (view.status === 'online' && healthNeedsAttention(healthOf(view.live))) next.attention += 1;
    }
    next.detectionsToday = (overview?.events ?? []).filter((event) => event.at >= startOfToday).length;
    return next;
  }, [counts, now, overview, views]);

  const formFactorFor = useCallback(
    (camera: ICameraCacheRow) =>
      formFactorOf(models, { catalogId: camera.catalogId, driver: camera.driver, model: camera.model }),
    [models],
  );
  const canTalkOf = useCallback(
    (camera: ICameraCacheRow) => {
      if (!canTalk || camera.driver !== 'tapo' || !camera.cloudUsername) return false;
      const model = findCatalogModel(models, {
        catalogId: camera.catalogId,
        driver: camera.driver,
        model: camera.model,
      });
      return model == null || model.features.speaker;
    },
    [canTalk, models],
  );

  const badgeOf = useCallback(
    (camera: ICameraCacheRow) => {
      const environment = environments.get(camera.id);
      if (!environment?.several) return null;
      return <StatusBadge icon={environment.armed ? 'shield-check' : 'home'} label={environment.name} />;
    },
    [environments],
  );

  const openCamera = useCallback((id: string) => router.push(`/cameras/${id}`), [router]);
  const talkTo = useCallback((id: string) => router.push(`/cameras/${id}?talk=1`), [router]);
  const openForm = useCallback(() => setFormOpen(true), []);
  const changeDensity = useCallback((next: CameraDensity) => {
    setDensity(next);
    try {
      storageService.set(CAMERA_DENSITY_STORAGE_KEY, next);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const detections = (
    <RecentDetections
      events={overview?.events ?? []}
      cameraNames={cameraNames}
      now={now}
      readable={readsEvents}
      limit={isExpanded ? 14 : 6}
      className={isExpanded ? 'flex-1' : undefined}
      onOpen={openCamera}
    />
  );

  const grid =
    visible.length === 0 ? (
      <EmptyState
        variant="panel"
        icon="search"
        title={t('screens.cameras.no-match')}
        hint={t('screens.cameras.no-match-hint')}
        action={
          <Button
            variant="outline"
            onPress={() => {
              setQuery('');
              setStatus('all');
            }}>
            <Text>{t('screens.cameras.catalog.clear')}</Text>
          </Button>
        }
      />
    ) : (
      <CameraCardGrid
        views={visible}
        density={density}
        now={now}
        formFactorOf={formFactorFor}
        canTalkOf={canTalkOf}
        badgeOf={badgeOf}
        isPending={isPendingCamera}
        thumbnails={thumbnails}
        livePreviews={livePreviews}
        onSelect={openCamera}
        onTalk={talkTo}
      />
    );

  return (
    <AppScreen
      scrollable={false}
      bottomNav={false}
      header={
        <ScreenHeader
          title={t(SCREEN_TITLE_KEYS.cameras)}
          subtitle={t('screens.cameras.subtitle', {
            online: String(counts.online),
            total: String(cameras.length),
          })}
          onBack={() => router.back()}
          action={canCreate ? <IconButton icon="plus" label={t('screens.cameras.connect')} onPress={openForm} /> : null}
        />
      }>
      {cameras.length === 0 ? (
        <View className="flex-1">
          <EmptyState
            icon="video"
            title={t('screens.cameras.empty')}
            hint={t('screens.cameras.empty-hint')}
            action={
              canCreate ? (
                <Button onPress={openForm}>
                  <Text>{t('screens.cameras.connect')}</Text>
                </Button>
              ) : null
            }
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="grow pb-6">
          {isExpanded ? (
            <View className="grow flex-row items-stretch gap-6">
              <View className="min-w-0 flex-1 gap-4">
                <CameraToolbar
                  query={query}
                  status={status}
                  sort={sort}
                  density={density}
                  counts={counts}
                  compact={false}
                  onQueryChange={setQuery}
                  onStatusChange={setStatus}
                  onSortChange={setSort}
                  onDensityChange={changeDensity}
                />
                {grid}
                {detections}
              </View>
              <View className="gap-4" style={{ width: RAIL_WIDTH }}>
                <CameraSummary counts={summary} layout="panel" views={views} now={now} className="flex-1" onOpen={openCamera} />
              </View>
            </View>
          ) : (
            <View className="gap-4">
              <CameraSummary counts={summary} layout="strip" />
              <CameraToolbar
                query={query}
                status={status}
                sort={sort}
                density={density}
                counts={counts}
                compact={isCompact}
                onQueryChange={setQuery}
                onStatusChange={setStatus}
                onSortChange={setSort}
                onDensityChange={changeDensity}
              />
              {grid}
              {detections}
            </View>
          )}
        </ScrollView>
      )}

      <CameraForm open={formOpen} onOpenChange={setFormOpen} />
    </AppScreen>
  );
}
