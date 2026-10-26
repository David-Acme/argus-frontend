import { clsx } from 'clsx';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useThemeTokens } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { LevelMeter } from '@/features/cameras/components/live/level-meter';
import type { TalkDock as TalkDockState } from '@/features/cameras/hooks/use-talk-dock';
import { TALK_NOTE } from '@/features/cameras/model/camera-stage';
import type { LiveControls, TalkNote } from '@/features/cameras/model/camera-stage';
import { DockActions } from '@/features/cameras/components/live/dock-actions';

export type TalkDockProps = {
  dock: TalkDockState;
  controls: LiveControls;
  note: TalkNote | null;
  cameraName: string;
};

type TalkButtonProps = { dock: TalkDockState };

type DockCaptionProps = { dock: TalkDockState; cameraName: string };

function TalkButton({ dock }: TalkButtonProps) {
  const { t } = useTranslation();
  const { elevation } = useThemeTokens();
  const ring = { boxShadow: elevation.talk };
  const calling = dock.phase === 'call' || dock.phase === 'opening';
  if (calling)
    return (
      <PressableSurface
        a11y={{ label: t('screens.cameras.call.end'), role: 'button' }}
        onPress={dock.call.end}
        haptic="impactLight"
        pressed={{ scale: 'surface' }}
        className="size-talk bg-alert items-center justify-center rounded-full"
        style={ring}>
        <Icon name="phone" size="large" tone="on-ink" />
      </PressableSurface>
    );
  return (
    <PressableSurface
      a11y={{
        label: t('screens.cameras.dock.hold'),
        role: 'button',
        selected: dock.phase === 'talking',
      }}
      hold={dock.hold}
      pressed={{ scale: 'surface' }}
      className={clsx(
        'size-talk items-center justify-center rounded-full',
        dock.phase === 'talking' ? 'bg-accent-fill' : 'bg-ink'
      )}
      style={ring}>
      <Icon name="mic" size="large" tone="on-ink" />
    </PressableSurface>
  );
}

function DockCaption({ dock, cameraName }: DockCaptionProps) {
  const { t } = useTranslation();
  if (dock.phase === 'idle')
    return (
      <Text variant="meta" align="center">
        {t('screens.cameras.dock.hold')}
      </Text>
    );
  return (
    <View className="gap-talk-gap items-center">
      <LevelMeter level={dock.level} label={t('screens.cameras.call.mic-level')} />
      {dock.phase === 'call' ? (
        <Text variant="meta" align="center">
          {t('screens.cameras.dock.in-call', { name: cameraName })}
        </Text>
      ) : null}
    </View>
  );
}

export function TalkDock({ dock, controls, note, cameraName }: TalkDockProps) {
  const { t } = useTranslation();
  const { trouble } = dock;
  return (
    <View className="mt-talk-top mb-talk-bottom gap-talk-gap">
      {controls.talk ? (
        <View className="gap-talk-gap items-center">
          <TalkButton dock={dock} />
          <DockCaption dock={dock} cameraName={cameraName} />
        </View>
      ) : null}
      {note ? (
        <Text variant="meta" align="center">
          {t(TALK_NOTE[note])}
        </Text>
      ) : null}
      {trouble ? (
        <Notice
          inline
          tone="attention"
          icon="mic"
          title={t(trouble.message)}
          action={
            trouble.askMic
              ? { label: t('screens.cameras.call.allow-mic'), onPress: dock.call.allowMicrophone }
              : undefined
          }
        />
      ) : null}
      <DockActions dock={dock} controls={controls} cameraName={cameraName} />
    </View>
  );
}
