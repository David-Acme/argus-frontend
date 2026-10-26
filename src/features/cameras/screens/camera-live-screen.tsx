import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { isVoiceCallActive } from '@/features/voice';
import { AnnounceSheet } from '@/features/cameras/components/live/announce-sheet';
import { LiveFullscreen } from '@/features/cameras/components/live/live-fullscreen';
import { LiveMenu, setCameraEnabled } from '@/features/cameras/components/live/live-menu';
import { LiveNotices } from '@/features/cameras/components/live/live-notices';
import { LiveRows } from '@/features/cameras/components/live/live-rows';
import { LiveStageView } from '@/features/cameras/components/live/live-stage';
import { TalkDock } from '@/features/cameras/components/live/talk-dock';
import { CameraForm } from '@/features/cameras/components/camera-form';
import { useCameraLive, useCameraRow } from '@/features/cameras/hooks/use-camera-live';
import type { CameraLive } from '@/features/cameras/hooks/use-camera-live';
import { useCameraMeta } from '@/features/cameras/hooks/use-camera-meta';
import { CAMERA_LIST_HREF } from '@/features/cameras/constants/routes.constant';

type LiveBodyProps = { view: CameraLive; talk: boolean };

function useAutoCall(view: CameraLive, wanted: boolean) {
  const called = useRef(false);
  const start = view.dock.call.start;
  const ready = wanted && view.controls.talk;
  useEffect(() => {
    if (!ready || called.current || isVoiceCallActive()) return;
    called.current = true;
    start('call', true);
  }, [ready, start]);
}

function LiveBody({ view, talk }: LiveBodyProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const { camera, live, controls, access } = view;
  const meta = useCameraMeta(camera);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/security'));
  useAutoCall(view, talk);
  return (
    <>
      <Screen
        columns
        title={camera.name}
        meta={meta}
        back={{ label: t('common.back'), onPress: back }}
        actions={
          <LiveMenu
            camera={camera}
            access={access}
            quality={controls.quality ? live.quality : null}
            onEdit={() => setEditing(true)}
            onAnnounce={controls.talk ? () => setAnnouncing(true) : null}
          />
        }>
        <ScreenColumns>
          <ScreenColumn label={camera.name} grows={-1}>
            <LiveStageView
              cameraId={camera.id}
              live={live}
              controls={controls}
              ptz={view.ptz}
              onTurnOn={access.update ? () => void setCameraEnabled(camera, true, null) : null}
              poster={view.poster}
            />
            <LiveNotices view={view} />
          </ScreenColumn>
          <ScreenColumn width={size.columnSide} label={t('screens.cameras.settings')}>
            <LiveRows camera={camera} clips={access.clips} sections={view.sections} />
            <TalkDock
              dock={view.dock}
              controls={controls}
              note={view.note}
              cameraName={camera.name}
            />
          </ScreenColumn>
        </ScreenColumns>
      </Screen>
      <LiveFullscreen cameraId={camera.id} live={live} controls={controls} ptz={view.ptz} />
      <CameraForm open={editing} onOpenChange={setEditing} camera={camera} />
      <AnnounceSheet cameraId={camera.id} open={announcing} onClose={() => setAnnouncing(false)} />
    </>
  );
}

export default function CameraLiveScreen() {
  const { id, talk } = useLocalSearchParams<{ id: string; talk?: string }>();
  const camera = useCameraRow(id);
  const view = useCameraLive(id, camera);
  if (!view) return <Redirect href={CAMERA_LIST_HREF} />;
  return <LiveBody view={view} talk={talk === '1'} />;
}
