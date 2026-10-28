import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { ICameraCacheRow, ICameraClip } from '@/core/interfaces';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraPrivacyMasked } from '@/shared/libs/camera-privacy';
import { resourceOf } from '@/shared/libs/remote-resource';
import { layout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { FilterChip } from '@/shared/ui/chip';
import { Cluster } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { ResourceView, Skeleton } from '@/shared/ui/resource-view';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { ClipTile } from '@/features/cameras/components/clips/clip-tile';
import { RecordingGuide } from '@/features/cameras/components/recordings/recording-guide';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { useCameraRecording } from '@/features/cameras/hooks/use-camera-recording';
import { useClipFeed, type ClipFeed } from '@/features/cameras/hooks/use-clip-feed';
import { CAMERA_LIST_HREF, CLIP_HREF } from '@/features/cameras/constants/routes.constant';
import {
  clipColumns,
  clipFeedScope,
  clipGridRows,
  clipMoment,
  visibleClips,
} from '@/features/cameras/model/camera-clips';
import { recordingPaused } from '@/features/cameras/model/camera-recording';

const MINUTE_MS = 60_000;

const SKELETON_TILES = 4;

type GridProps = {
  clips: readonly ICameraClip[];
  names: ReadonlyMap<string, string>;
  showCamera: boolean;
  onOpen: (clip: ICameraClip) => void;
};

type EmptyCopy = { message: string; detail: string };

function ClipGrid({ clips, names, showCamera, onOpen }: GridProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const now = useNow(MINUTE_MS);
  const [columns, setColumns] = useState(2);
  const measure = (event: LayoutChangeEvent) =>
    setColumns(
      clipColumns(event.nativeEvent.layout.width, layout.mediaGridThree, layout.mediaGridFour)
    );
  return (
    <View className="gap-media-grid-gap" onLayout={measure}>
      {clipGridRows(clips, columns).map((row, index) => (
        <View key={row[0]?.id ?? index} className="gap-media-grid-gap flex-row">
          {row.map((clip, slot) => (
            <View key={clip?.id ?? `slot-${slot}`} className="min-w-0 flex-1">
              {clip ? (
                <ClipTile
                  clip={clip}
                  cameraName={names.get(clip.cameraId) ?? ''}
                  moment={clipMoment({
                    at: clip.startedAt * 1000,
                    now,
                    t,
                    time: date.formatTime,
                    day: date.formatDayMonth,
                  })}
                  showCamera={showCamera}
                  onOpen={onOpen}
                />
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function GridSkeleton() {
  const slots = Array.from({ length: SKELETON_TILES }, (_, index) => index);
  return (
    <View className="gap-media-grid-gap">
      {clipGridRows(slots, 2).map((row) => (
        <View key={row[0]} className="gap-media-grid-gap flex-row">
          {row.map((slot) => (
            <View key={slot} className="flex-1">
              <Skeleton shape="well" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

type FilterProps = {
  cameras: readonly ICameraCacheRow[];
  selected: string | null;
  onChoose: (camera: string | null) => void;
};

function CameraFilter({ cameras, selected, onChoose }: FilterProps) {
  const { t } = useTranslation();
  if (cameras.length < 2) return null;
  return (
    <Section variant="plain">
      <Cluster>
        <FilterChip
          size="view"
          label={t('screens.cameras.clips.every-camera')}
          selected={selected === null}
          onPress={() => onChoose(null)}
        />
        {cameras.map((camera) => (
          <FilterChip
            key={camera.id}
            size="view"
            label={camera.name}
            selected={camera.id === selected}
            onPress={() => onChoose(camera.id)}
          />
        ))}
      </Cluster>
    </Section>
  );
}

type FooterProps = { paging: ClipFeed['paging'] };

function FeedFooter({ paging }: FooterProps) {
  const { t } = useTranslation();
  if (paging.footer === 'loading')
    return (
      <Section variant="plain">
        <Button
          block
          variant="secondary"
          label={t('screens.cameras.clips.more')}
          onPress={paging.onEndReached}
          busy={paging.loading}
        />
      </Section>
    );
  if (paging.footer !== 'error') return null;
  return (
    <Section variant="plain">
      <Notice
        inline
        tone="attention"
        icon="alert"
        title={t('screens.cameras.clips.load-failed')}
        action={{ label: t('screens.cameras.stage.retry'), onPress: paging.retry }}
      />
    </Section>
  );
}

function PausedNotice() {
  const { t } = useTranslation();
  const { clips: access } = useCapabilities();
  const recording = useCameraRecording(access.view);
  if (!recording || !recordingPaused(recording)) return null;
  return (
    <Notice
      inline
      tone="attention"
      icon="alert"
      title={t('screens.cameras.recording-paused')}
      body={t('screens.cameras.recording-paused-detail', {
        free: recording.freeGb,
        min: recording.minFreeGb,
      })}
    />
  );
}

function useEmptyCopy(camera: ICameraCacheRow | null): EmptyCopy {
  const { t } = useTranslation();
  if (camera && cameraPrivacyMasked(camera.privacyState))
    return {
      message: t('screens.cameras.clips.privacy'),
      detail: t('screens.cameras.clips.privacy-hint'),
    };
  if (camera?.recordMode === 'off')
    return {
      message: t('screens.cameras.clips.unavailable'),
      detail: t('screens.cameras.clips.unavailable-hint'),
    };
  return {
    message: t('screens.cameras.clips.empty'),
    detail: camera
      ? t('screens.cameras.clips.empty-hint')
      : t('screens.cameras.clips.all-empty-hint'),
  };
}

function useEmptyAction(camera: ICameraCacheRow | null) {
  const { t } = useTranslation();
  const router = useRouter();
  return camera
    ? {
        label: t('screens.cameras.clips.watch-live'),
        onPress: () => router.push(`/cameras/${camera.id}`),
      }
    : {
        label: t('screens.cameras.clips.open-cameras'),
        onPress: () => router.push(CAMERA_LIST_HREF),
      };
}

export default function ClipsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { camera: filter } = useLocalSearchParams<{ camera?: string }>();
  const { clips: access } = useCapabilities();
  const { cameras } = useCameraRows();
  const selected = cameras.find((camera) => camera.id === filter) ?? null;
  const cameraId = selected?.id ?? null;
  const feed = useClipFeed(cameraId, access.view);
  const copy = useResourceCopy({ title: t('screens.cameras.clips.load-failed') });
  const empty = useEmptyCopy(selected);
  const emptyAction = useEmptyAction(selected);
  const [refreshing, setRefreshing] = useState(false);
  const names = new Map(cameras.map((camera) => [camera.id, camera.name]));
  const resource = resourceOf({
    data: feed.status === 'ready' ? visibleClips(feed.rows, names) : null,
    status: feed.status,
    retry: feed.reload,
    empty: (clips) => clips.length === 0 && !feed.hasMore,
  });
  const open = (clip: ICameraClip) =>
    router.push({
      pathname: CLIP_HREF,
      params: { id: clip.id, camera: clip.cameraId, scope: clipFeedScope(cameraId) },
    });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/security'));
  const refresh = async () => {
    setRefreshing(true);
    await feed.reload();
    setRefreshing(false);
  };
  return (
    <Screen
      title={t('screens.cameras.clips.all-title')}
      meta={selected?.name}
      back={{ label: t('common.back'), onPress: back }}
      refresh={{ refreshing, onRefresh: () => void refresh() }}
      onEndReached={feed.paging.onEndReached}>
      <CameraFilter
        cameras={cameras}
        selected={cameraId}
        onChoose={(next) => router.setParams({ camera: next ?? undefined })}
      />
      <PausedNotice />
      <Section variant="plain">
        <ResourceView
          resource={resource}
          copy={copy}
          skeleton={<GridSkeleton />}
          empty={{ ...empty, icon: 'play', centred: true, action: emptyAction }}>
          {(clips) => (
            <ClipGrid
              clips={clips}
              names={names}
              showCamera={cameraId === null && cameras.length > 1}
              onOpen={open}
            />
          )}
        </ResourceView>
      </Section>
      <FeedFooter paging={feed.paging} />
      {selected && feed.paging.footer !== 'loading' ? <RecordingGuide camera={selected} /> : null}
    </Screen>
  );
}
