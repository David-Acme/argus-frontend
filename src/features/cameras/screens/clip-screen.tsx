import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import type { ICameraClip } from '@/core/interfaces';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runServiceAction } from '@/shared/libs/service-action';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { hasMenuItems, Menu, type MenuItem } from '@/shared/ui/menu';
import { Row } from '@/shared/ui/row';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { ClipStage } from '@/features/cameras/components/recordings/clip-stage';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { useClipPlayback } from '@/features/cameras/hooks/use-clip-playback';
import {
  CLIP_FEED_ALL,
  clipFacts,
  clipGlyph,
  clipMoment,
} from '@/features/cameras/model/camera-clips';
import { cameraClipsService, clipFeed } from '@/features/cameras/services/camera-clips.service';
import { CLIPS_HREF } from '@/features/cameras/constants/routes.constant';

type ClipParams = { id: string; camera: string; scope?: string };

const MINUTE_MS = 60_000;

function clipOf({ id, camera, scope }: ClipParams): ICameraClip | null {
  const rows = clipFeed.snapshot(scope ?? CLIP_FEED_ALL)?.rows ?? [];
  return rows.find((row) => row.id === id && row.cameraId === camera) ?? null;
}

type FactsProps = { clip: ICameraClip | null; cameraId: string; cameraName: string | null };

function ClipFacts({ clip, cameraId, cameraName }: FactsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const date = useDateFormatter();
  if (!clip)
    return (
      <Section variant="plain">
        <Button
          block
          variant="secondary"
          label={t('screens.cameras.clips.open-all')}
          onPress={() => router.replace(CLIPS_HREF)}
        />
      </Section>
    );
  return (
    <Section>
      <Row
        leading={<Avatar icon={clipGlyph(clip)} />}
        title={clipFacts(t, clip)}
        meta={date.formatDayMonth(new Date(clip.startedAt * 1000))}
      />
      {cameraName ? (
        <Row
          leading={<Avatar icon="cam" />}
          title={t('screens.cameras.clips.watch-live')}
          meta={cameraName}
          chevron
          onPress={() => router.push(`/cameras/${cameraId}`)}
        />
      ) : null}
    </Section>
  );
}

function useRemoveClip(clip: ICameraClip | null, done: () => void) {
  const { t } = useTranslation();
  return async () => {
    if (!clip) return;
    const removed = await runServiceAction({
      confirm: {
        title: t('screens.cameras.clips.delete-title'),
        description: t('screens.cameras.clips.delete-description'),
        confirmLabel: t('screens.cameras.clips.delete-confirm'),
        intent: 'danger',
      },
      call: () => cameraClipsService.remove(clip.cameraId, clip.id),
      success: t('screens.cameras.clips.deleted'),
      errorTitle: t('screens.cameras.clips.delete-failed'),
    });
    if (!removed) return;
    clipFeed.mutateAll((rows) => rows.filter((row) => row.id !== clip.id));
    done();
  };
}

type ClipMenuInput = {
  clip: ICameraClip | null;
  camera: { id: string; name: string } | null;
  removable: boolean;
  remove: () => Promise<void>;
};

function useClipMenu({ clip, camera, removable, remove }: ClipMenuInput): MenuItem[] {
  const { t } = useTranslation();
  const router = useRouter();
  if (!clip) return [];
  const list: MenuItem[] = camera
    ? [
        {
          label: t('screens.cameras.clips.camera-clips', { camera: camera.name }),
          icon: 'grid',
          family: 'view',
          onPress: () => router.replace({ pathname: CLIPS_HREF, params: { camera: camera.id } }),
        },
      ]
    : [];
  return removable
    ? [
        ...list,
        {
          label: t('screens.cameras.clips.delete'),
          icon: 'trash',
          destructive: true,
          confirm: 'by-action',
          onPress: remove,
        },
      ]
    : list;
}

export default function ClipScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const date = useDateFormatter();
  const now = useNow(MINUTE_MS);
  const params = useLocalSearchParams<ClipParams>();
  const { id, camera: cameraId, scope } = params;
  const { clips: access } = useCapabilities();
  const { cameras } = useCameraRows();
  const clip = clipOf(params);
  const known = clip !== null;
  const camera = cameras.find((row) => row.id === cameraId) ?? null;
  const playback = useClipPlayback(cameraId);
  const { open, close } = playback;
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: CLIPS_HREF, params: { camera: cameraId } });
  const remove = useRemoveClip(clip, () => {
    close();
    back();
  });

  const menu = useClipMenu({ clip, camera, removable: access.remove, remove });

  useEffect(() => {
    const opened = known && access.view ? clipOf({ id, camera: cameraId, scope }) : null;
    if (opened) open(opened);
  }, [access.view, cameraId, id, known, open, scope]);

  return (
    <Screen
      title={camera?.name ?? t('screens.cameras.clips.title')}
      meta={
        clip
          ? clipMoment({
              at: clip.startedAt * 1000,
              now,
              t,
              time: date.formatTime,
              day: date.formatDayMonth,
            })
          : undefined
      }
      back={{ label: t('common.back'), onPress: back }}
      actions={
        hasMenuItems(menu) ? (
          <Menu label={t('screens.cameras.clips.menu')} items={menu} />
        ) : undefined
      }>
      <ClipStage playback={playback} closable={false} />
      <ClipFacts clip={clip} cameraId={cameraId} cameraName={camera?.name ?? null} />
    </Screen>
  );
}
