import type { TalkDock } from '@/features/cameras/hooks/use-talk-dock';
import type { LiveControls } from '@/features/cameras/model/camera-stage';
import { useTranslation } from '@/shared/hooks/use-translation';
import { feedback } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Confirm } from '@/shared/ui/confirm';
import { Inline } from '@/shared/ui/layout';

export type DockActionsProps = { dock: TalkDock; controls: LiveControls; cameraName: string };

type SirenButtonProps = { dock: TalkDock };

function SirenButton({ dock }: SirenButtonProps) {
  const { t } = useTranslation();
  const { siren } = dock;
  if (siren.phase === 'countdown')
    return (
      <Button
        compact
        block
        variant="danger"
        icon="siren"
        label={t('screens.cameras.dock.siren-cancel', { seconds: String(siren.remaining) })}
        onPress={siren.cancel}
      />
    );
  if (siren.sounding)
    return (
      <Button
        compact
        block
        variant="danger"
        icon="siren"
        label={t('screens.cameras.dock.siren-stop', { seconds: String(siren.remaining) })}
        onPress={siren.stop}
      />
    );
  return (
    <Button
      compact
      block
      variant="danger"
      icon="siren"
      label={t('screens.cameras.siren-title')}
      onPress={siren.ask}
    />
  );
}

function CallButton({ dock }: SirenButtonProps) {
  const { t } = useTranslation();
  const { call, phase } = dock;
  const muted = call.snapshot?.muted === true;
  if (phase === 'call' || phase === 'opening')
    return (
      <Button
        compact
        block
        icon="mic"
        label={muted ? t('screens.cameras.call.unmute') : t('screens.cameras.call.mute')}
        onPress={() => call.setMuted(!muted)}
      />
    );
  return (
    <Button
      compact
      block
      icon="phone"
      label={t('screens.cameras.dock.call')}
      disabled={phase === 'talking'}
      onPress={() => call.start('call', true)}
    />
  );
}

export function DockActions({ dock, controls, cameraName }: DockActionsProps) {
  const { t } = useTranslation();
  const { siren } = dock;
  if (!controls.talk && !controls.siren) return null;
  return (
    <>
      <Inline gap={2} fill>
        {controls.talk ? <CallButton dock={dock} /> : null}
        {controls.siren ? <SirenButton dock={dock} /> : null}
      </Inline>
      <Confirm
        open={siren.phase === 'confirm'}
        variant="destructive"
        title={t('screens.cameras.dock.siren-confirm-title')}
        body={t('screens.cameras.dock.siren-confirm-body', { name: cameraName })}
        confirmLabel={t('screens.cameras.siren-activate')}
        onConfirm={() => {
          feedback('warning');
          siren.confirm();
        }}
        onCancel={siren.cancel}
      />
    </>
  );
}
