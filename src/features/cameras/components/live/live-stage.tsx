import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Stack } from '@/shared/ui/layout';
import { Media } from '@/shared/ui/media';
import type { MediaControl, MediaDormant } from '@/shared/ui/media';
import { Text } from '@/shared/ui/text';
import { CameraLiveView } from '@/features/cameras/components/camera-live-view';
import { PtzPad } from '@/features/cameras/components/live/ptz-pad';
import type { CameraPtzControls } from '@/features/cameras/hooks/use-camera-ptz';
import type { LiveStage } from '@/features/cameras/hooks/use-live-stage';
import type { CameraStage, LiveControls } from '@/features/cameras/model/camera-stage';

export type LiveStageViewProps = {
  cameraId: string;
  live: LiveStage;
  controls: LiveControls;
  ptz: CameraPtzControls | null;
  onTurnOn: (() => void) | null;
};

type StageCenterProps = { stage: CameraStage; onRetry: () => void; onTurnOn: (() => void) | null };

const DORMANT: Partial<Record<CameraStage['kind'], MediaDormant>> = {
  off: 'off',
  privacy: 'privacy',
};

function StageCenter({ stage, onRetry, onTurnOn }: StageCenterProps) {
  const { t } = useTranslation();
  if (stage.kind === 'off' && onTurnOn)
    return (
      <Stack gap={3} align="center">
        <Icon name="eyeoff" tone="text-2" />
        <Button
          compact
          variant="secondary"
          label={t('screens.cameras.stage.turn-on')}
          onPress={onTurnOn}
        />
      </Stack>
    );
  if (stage.kind !== 'blocked') return null;
  return (
    <Stack gap={3} align="center">
      <Icon name={stage.retry ? 'wifioff' : 'alert'} tone="on-media" />
      <Text variant="label" tone="on-media" align="center">
        {t(stage.message)}
      </Text>
      {stage.retry ? (
        <Text variant="meta" tone="on-media" align="center">
          {t('screens.cameras.stage.unreachable-hint')}
        </Text>
      ) : null}
      {stage.retry ? (
        <Button compact glass label={t('screens.cameras.stage.retry')} onPress={onRetry} />
      ) : null}
    </Stack>
  );
}

function useStageControls(live: LiveStage, controls: LiveControls): MediaControl[] {
  const { t } = useTranslation();
  const { audio } = live;
  const silent = audio.muted || audio.blocked || audio.level === 0;
  const list: MediaControl[] = [];
  if (controls.ptz)
    list.push({
      icon: 'move',
      label: live.ptzShown ? t('screens.cameras.stage.move-done') : t('screens.cameras.stage.move'),
      onPress: () => live.setPtzShown(!live.ptzShown),
    });
  if (controls.sound)
    list.push({
      icon: silent ? 'mute' : 'speaker',
      label: silent ? t('screens.cameras.live.unmute') : t('screens.cameras.live.mute'),
      onPress: audio.toggle,
    });
  if (controls.fullscreen)
    list.push({
      icon: 'max',
      label: t('screens.cameras.live.fullscreen'),
      onPress: () => live.setFullscreen(true),
    });
  return list;
}

function dormantLabel(kind: CameraStage['kind']) {
  if (kind === 'privacy') return 'screens.cameras.stage.privacy' as const;
  if (kind === 'off') return 'screens.cameras.stage.off' as const;
  return null;
}

export function LiveStageView({ cameraId, live, controls, ptz, onTurnOn }: LiveStageViewProps) {
  const { t } = useTranslation();
  const mediaControls = useStageControls(live, controls);
  const { stage, audio } = live;
  const label = dormantLabel(stage.kind);
  const retry = () => live.view?.retry();
  const centered = stage.kind === 'blocked' || (stage.kind === 'off' && onTurnOn !== null);
  return (
    <Media
      variant="stage"
      name={label ? t(label) : undefined}
      live={stage.kind === 'live' ? t('screens.cameras.live.live') : undefined}
      dormant={DORMANT[stage.kind]}
      eye={controls.eye ? { label: t('screens.cameras.stage.eye') } : undefined}
      controls={mediaControls}
      center={
        centered ? <StageCenter stage={stage} onRetry={retry} onTurnOn={onTurnOn} /> : undefined
      }>
      {live.fullscreen ? null : (
        <>
          <CameraLiveView
            cameraId={cameraId}
            quality={live.quality.quality}
            fill
            className="rounded-none"
            onStatus={live.onStatus}
            onStats={live.onStats}
            onState={live.onState}
            audioLevel={audio.level}
            audioUnlock={audio.unlockKey}
            onAudioBlocked={audio.setBlocked}
          />
          {live.ptzShown && ptz ? <PtzPad ptz={ptz} /> : null}
        </>
      )}
    </Media>
  );
}
