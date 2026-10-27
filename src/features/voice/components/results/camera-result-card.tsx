import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraPrivacyMasked } from '@/shared/libs/camera-privacy';
import { Button } from '@/shared/ui/button';
import { Media } from '@/shared/ui/media';
import { CameraLiveView, useCameraPrivacy, useCameraStill } from '@/features/cameras';
import type { ResultActions } from '@/features/voice/hooks/use-result-actions';
import type { CameraResult } from '@/features/voice/model/argus-result';
import {
  ResultActionsRow,
  ResultHead,
  ResultShell,
} from '@/features/voice/components/results/result-shell';

export type CameraResultCardProps = {
  result: CameraResult;
  live: boolean;
  actions: ResultActions;
};

type LiveTileProps = { cameraId: string; name: string; actions: ResultActions };

type StillTileProps = LiveTileProps;

function LiveTile({ cameraId, name, actions }: LiveTileProps) {
  const { t } = useTranslation();
  const privacy = useCameraPrivacy(cameraId);
  return (
    <ResultShell surface={actions.surface} label={name}>
      <Media
        name={name}
        live={t('screens.voice.results.live')}
        eye={{ label: t('screens.voice.results.looking') }}>
        <CameraLiveView
          cameraId={cameraId}
          quality="sub"
          privacy={cameraPrivacyMasked(privacy)}
          fill
        />
      </Media>
      <ResultActionsRow>
        <Button
          compact
          variant="primary"
          icon="max"
          label={t('screens.voice.results.view-large')}
          onPress={() => actions.openCamera(cameraId)}
        />
        {actions.talk ? (
          <Button
            compact
            icon="mic"
            label={t('screens.voice.results.talk')}
            onPress={() => actions.talk?.(cameraId)}
          />
        ) : null}
      </ResultActionsRow>
    </ResultShell>
  );
}

function StillTile({ cameraId, name, actions }: StillTileProps) {
  const { t } = useTranslation();
  const masked = cameraPrivacyMasked(useCameraPrivacy(cameraId));
  const still = useCameraStill(masked ? null : cameraId);
  return (
    <ResultShell surface={actions.surface} label={name}>
      <Media
        name={name}
        dormant={masked ? 'privacy' : undefined}
        frame={still ? { uri: still } : undefined}
      />
      <ResultActionsRow>
        <Button
          compact
          icon="play"
          label={t('screens.voice.results.view-live')}
          onPress={() => actions.openCamera(cameraId)}
        />
      </ResultActionsRow>
    </ResultShell>
  );
}

export function CameraResultCard({ result, live, actions }: CameraResultCardProps) {
  const { t } = useTranslation();
  const { cameraId } = result;
  if (live && cameraId !== null)
    return <LiveTile cameraId={cameraId} name={result.name} actions={actions} />;
  if (cameraId !== null && result.status === 'done')
    return <StillTile cameraId={cameraId} name={result.name} actions={actions} />;
  const failed = result.status === 'failed';
  const title = failed
    ? t('screens.voice.results.camera-failed')
    : result.name
      ? t('screens.voice.results.camera-shown', { name: result.name })
      : t('screens.voice.results.camera-any');
  return (
    <ResultShell surface={actions.surface} label={title}>
      <ResultHead
        icon="cam"
        tone={failed ? 'alert' : 'accent'}
        title={title}
        meta={failed ? undefined : t('screens.voice.results.shown-now')}
      />
      {cameraId !== null && !failed ? (
        <ResultActionsRow>
          <Button
            compact
            label={t('screens.voice.results.view')}
            onPress={() => actions.openCamera(cameraId)}
          />
        </ResultActionsRow>
      ) : null}
    </ResultShell>
  );
}
