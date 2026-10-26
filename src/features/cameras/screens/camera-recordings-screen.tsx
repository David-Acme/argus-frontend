import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ICameraCacheRow, ICameraClip } from '@/core/interfaces';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraPrivacyMasked } from '@/shared/libs/camera-privacy';
import { runServiceAction } from '@/shared/libs/service-action';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { ClipStage } from '@/features/cameras/components/recordings/clip-stage';
import { useCameraRow } from '@/features/cameras/hooks/use-camera-live';
import { useCameraClips } from '@/features/cameras/hooks/use-camera-clips';
import type { CameraClipsState } from '@/features/cameras/hooks/use-camera-clips';
import { useCameraRecording } from '@/features/cameras/hooks/use-camera-recording';
import { useClipPlayback } from '@/features/cameras/hooks/use-clip-playback';
import { clipRowSubtitle } from '@/features/cameras/model/camera-clips';
import { recordingPaused } from '@/features/cameras/model/camera-recording';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';
import { CAMERA_LIST_HREF } from '@/features/cameras/constants/routes.constant';

type ClipsBodyProps = { camera: ICameraCacheRow };

type ClipRowsProps = {
  state: CameraClipsState;
  removable: boolean;
  onOpen: (clip: ICameraClip) => void;
  onRemove: (clip: ICameraClip) => void;
};

function ClipRows({ state, removable, onOpen, onRemove }: ClipRowsProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  return (
    <Section title={t('screens.cameras.clips.title')}>
      {state.clips.map((clip) => {
        const at = new Date(clip.startedAt * 1000);
        return (
          <Row
            key={clip.id}
            leading={<Avatar icon="play" />}
            title={date.formatTime(at)}
            meta={clipRowSubtitle(t, clip, date.formatDayMonth(at))}
            trailing={
              removable ? (
                <Button
                  iconOnly
                  compact
                  icon="x"
                  label={t('screens.cameras.clips.delete')}
                  onPress={() => onRemove(clip)}
                />
              ) : undefined
            }
            onPress={() => onOpen(clip)}
          />
        );
      })}
    </Section>
  );
}

function EmptyClips({ camera }: ClipsBodyProps) {
  const { t } = useTranslation();
  const router = useRouter();
  if (cameraPrivacyMasked(camera.privacyState))
    return (
      <Notice
        icon="lock"
        title={t('screens.cameras.clips.privacy')}
        body={t('screens.cameras.clips.privacy-hint')}
      />
    );
  if (camera.recordMode === 'off')
    return (
      <Notice
        icon="play"
        title={t('screens.cameras.clips.unavailable')}
        body={t('screens.cameras.clips.unavailable-hint')}
        action={{
          label: t('screens.cameras.settings'),
          onPress: () => router.push(`/cameras/${camera.id}/settings`),
        }}
      />
    );
  return (
    <Notice
      icon="play"
      title={t('screens.cameras.clips.empty')}
      body={t('screens.cameras.clips.empty-hint')}
      action={{ label: t('screens.cameras.clips.watch-live'), onPress: () => router.back() }}
    />
  );
}

function ClipsBody({ camera }: ClipsBodyProps) {
  const { t } = useTranslation();
  const { clips: access } = useCapabilities();
  const state = useCameraClips(camera.id, access.view && camera.recordMode !== 'off');
  const recording = useCameraRecording(access.view);
  const playback = useClipPlayback(camera.id);
  const remove = async (clip: ICameraClip) => {
    const done = await runServiceAction({
      confirm: {
        title: t('screens.cameras.clips.delete-title'),
        description: t('screens.cameras.clips.delete-description'),
        confirmLabel: t('screens.cameras.clips.delete-confirm'),
        intent: 'danger',
      },
      call: () => cameraClipsService.remove(camera.id, clip.id),
      success: t('screens.cameras.clips.deleted'),
      errorTitle: t('screens.cameras.clips.delete-failed'),
    });
    if (!done) return;
    if (playback.clip?.id === clip.id) playback.close();
    state.forget(clip);
  };
  const loading =
    state.clips.length === 0 && (state.status === 'loading' || state.status === 'idle');
  return (
    <>
      {recording && recordingPaused(recording) ? (
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
      ) : null}
      <ClipStage playback={playback} />
      {state.clips.length > 0 ? (
        <ClipRows
          state={state}
          removable={access.remove}
          onOpen={playback.open}
          onRemove={(clip) => void remove(clip)}
        />
      ) : loading && camera.recordMode !== 'off' ? (
        <Section>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </Section>
      ) : (
        <Section variant="plain">
          {state.status === 'failed' ? (
            <Notice
              icon="alert"
              title={t('screens.cameras.clips.load-failed')}
              action={{ label: t('screens.cameras.stage.retry'), onPress: state.reload }}
            />
          ) : (
            <EmptyClips camera={camera} />
          )}
        </Section>
      )}
      {state.hasMore ? (
        <Section variant="plain">
          <Button
            block
            variant="secondary"
            label={t('screens.cameras.clips.more')}
            onPress={state.loadMore}
            busy={state.loadingMore}
          />
        </Section>
      ) : null}
    </>
  );
}

export default function CameraRecordingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const camera = useCameraRow(id);
  if (!camera) return <Redirect href={CAMERA_LIST_HREF} />;
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/cameras/${id}`));
  return (
    <Screen
      title={t('screens.cameras.rows.recordings')}
      meta={camera.name}
      back={{ label: t('common.back'), onPress: back }}>
      <ClipsBody camera={camera} />
    </Screen>
  );
}
