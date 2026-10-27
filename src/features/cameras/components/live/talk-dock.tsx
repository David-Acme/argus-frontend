import { clsx } from 'clsx';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size, talkSizeOf, useHeightLayout, useThemeTokens } from '@/shared/theme';
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

type TalkButtonProps = { dock: TalkDockState; compact: boolean };

type DockCaptionProps = { dock: TalkDockState; cameraName: string; compact: boolean };

function TalkButton({ dock, compact }: TalkButtonProps) {
  const frame = compact ? 'size-talk-short' : 'size-talk';
  const glyph = compact ? 'default' : 'large';
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
        className={clsx(frame, 'bg-alert items-center justify-center rounded-full')}
        style={ring}>
        <Icon name="phone" size={glyph} tone="on-ink" />
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
      onPress={dock.tap}
      pressed={{ scale: 'surface' }}
      className={clsx(
        frame,
        'items-center justify-center rounded-full',
        dock.phase === 'talking' ? 'bg-accent-fill' : 'bg-ink'
      )}
      style={ring}>
      <Icon name="mic" size={glyph} tone="on-ink" />
    </PressableSurface>
  );
}

function DockCaption({ dock, cameraName, compact }: DockCaptionProps) {
  const { t } = useTranslation();
  if (dock.phase === 'idle' && compact) return null;
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
  const height = useHeightLayout();
  const compact = talkSizeOf(height) === size.talkShort;
  const button = controls.talk ? <TalkButton dock={dock} compact={compact} /> : null;
  return (
    <View className="mt-talk-top mb-talk-bottom gap-talk-gap">
      {button && !compact ? (
        <View className="gap-talk-gap items-center">
          {button}
          <DockCaption dock={dock} cameraName={cameraName} compact={false} />
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
      <DockActions
        dock={dock}
        controls={controls}
        cameraName={cameraName}
        center={compact ? button : null}
        vertical={height.landscape}
      />
      {compact && controls.talk ? (
        <DockCaption dock={dock} cameraName={cameraName} compact />
      ) : null}
    </View>
  );
}
