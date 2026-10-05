import { Pressable, View } from 'react-native';
import type { IconName, TranslationKey } from '@/core/types';
import type { CameraCallControls } from '@/features/cameras/hooks/use-camera-call';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CameraCallPanelProps = {
  controls: CameraCallControls;
  canTalk: boolean;
  talkHint?: string | null;
  micSupported: boolean;
  argusCallActive: boolean;
  className?: string;
  onAnnounce?: () => void;
};

type LevelMeterProps = {
  icon: IconName;
  label: string;
  level: number;
};

type AudioActionProps = {
  icon: IconName;
  label: string;
  hint: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type RoundButtonProps = {
  icon: IconName;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
};

const BARS = 12;

const ERROR_LABEL: Record<string, TranslationKey> = {
  busy: 'screens.cameras.call.error-busy',
  forbidden: 'screens.cameras.call.error-forbidden',
  'no-speaker': 'screens.cameras.call.error-no-speaker',
  refused: 'screens.cameras.call.error-refused',
  network: 'screens.cameras.call.error-network',
  'no-session': 'screens.cameras.call.error-network',
  'session-ended': 'screens.cameras.call.error-session-ended',
  'mic-denied': 'screens.cameras.call.error-mic-denied',
  'mic-unavailable': 'screens.cameras.call.error-mic-unavailable',
};

const CLOSED_LABEL: Record<string, TranslationKey> = {
  idle: 'screens.cameras.call.closed-idle',
  limit: 'screens.cameras.call.closed-limit',
  line_lost: 'screens.cameras.call.closed-line-lost',
  session_revoked: 'screens.cameras.call.closed-revoked',
  session_expired: 'screens.cameras.call.closed-revoked',
  role_changed: 'screens.cameras.call.error-forbidden',
};

function LevelMeter({ icon, label, level }: LevelMeterProps) {
  const lit = Math.round(level * BARS);
  return (
    <View className="flex-row items-center gap-2" accessibilityLabel={label}>
      <Icon name={icon} className="text-muted-foreground size-4" />
      <View className="h-3 flex-1 flex-row items-end gap-0.5">
        {Array.from({ length: BARS }, (_, index) => (
          <View
            key={index}
            className={cn('flex-1 rounded-sm', index < lit ? 'bg-accent' : 'bg-surface-secondary')}
            style={{ height: `${40 + (index / BARS) * 60}%` }}
          />
        ))}
      </View>
    </View>
  );
}

function RoundButton({ icon, label, active = false, danger = false, onPress }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        'size-11 items-center justify-center rounded-full active:opacity-70',
        danger ? 'bg-error' : active ? 'bg-interactive' : 'bg-surface-secondary',
      )}>
      <Icon
        name={icon}
        className={cn(
          'size-5',
          danger ? 'text-foreground-on-error' : active ? 'text-foreground-on-interactive' : 'text-foreground',
        )}
      />
    </Pressable>
  );
}

function AudioAction({ icon, label, hint, primary = false, disabled = false, onPress }: AudioActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'min-w-[140px] flex-1 gap-1.5 rounded-2xl px-3 py-3',
        primary ? 'bg-interactive' : 'bg-surface-secondary dark:bg-card-secondary',
        disabled ? 'opacity-50' : 'active:opacity-80 web:hover:opacity-90',
      )}>
      <Icon
        name={icon}
        className={cn('size-5', primary ? 'text-foreground-on-interactive' : 'text-foreground')}
      />
      <Text variant="label" className={primary ? 'text-foreground-on-interactive' : 'text-foreground'}>
        {label}
      </Text>
      <Text variant="micro" className={primary ? 'text-foreground-on-interactive' : undefined}>
        {hint}
      </Text>
    </Pressable>
  );
}

export function CameraCallPanel({
  controls,
  canTalk,
  talkHint,
  micSupported,
  argusCallActive,
  className,
  onAnnounce,
}: CameraCallPanelProps) {
  const { t } = useTranslation();
  const { snapshot } = controls;
  const blockedReason = !canTalk
    ? null
    : argusCallActive
      ? t('screens.cameras.call.argus-busy')
      : !micSupported
        ? t('screens.cameras.call.no-mic')
        : null;
  const errorKey = snapshot?.error ? ERROR_LABEL[snapshot.error] : undefined;
  const closedKey = snapshot?.closedReason ? CLOSED_LABEL[snapshot.closedReason] : undefined;
  const notice = errorKey ? t(errorKey) : closedKey ? t(closedKey) : null;
  const pushMode = snapshot?.mode === 'push';
  const live = snapshot != null && snapshot.state !== 'idle';

  if (!snapshot) {
    if (!canTalk) {
      if (!talkHint) return null;
      return (
        <Panel title={t('screens.cameras.call.title')} className={className}>
          <Text variant="caption">{talkHint}</Text>
        </Panel>
      );
    }
    return (
      <Panel title={t('screens.cameras.call.title')} description={t('screens.cameras.call.description')} className={className}>
        <View className="gap-2">
          <View className="flex-row flex-wrap gap-2">
            <AudioAction
              icon="mic"
              label={t('screens.cameras.call.push')}
              hint={t('screens.cameras.call.push-hint')}
              disabled={blockedReason != null}
              onPress={() => controls.start('push', true)}
            />
            <AudioAction
              icon="phone"
              label={t('screens.cameras.call.call')}
              hint={t('screens.cameras.call.call-hint')}
              disabled={blockedReason != null}
              primary
              onPress={() => controls.start('call', true)}
            />
          </View>
          {onAnnounce ? (
            <Button variant="ghost" size="sm" onPress={onAnnounce} className="self-start">
              <Icon name="messages-square" className="text-foreground size-4" />
              <Text>{t('screens.cameras.call.announce')}</Text>
            </Button>
          ) : null}
          {blockedReason ? <Text variant="caption">{blockedReason}</Text> : null}
          <Text variant="micro">{t('screens.cameras.call.echo-hint')}</Text>
        </View>
      </Panel>
    );
  }

  const status =
    snapshot.state === 'connecting'
      ? t('screens.cameras.call.connecting')
      : pushMode
          ? snapshot.talking
            ? t('screens.cameras.call.talking')
            : t('screens.cameras.call.push-ready')
          : snapshot.muted
            ? t('screens.cameras.call.muted')
            : t('screens.cameras.call.in-call');
  const title = pushMode ? t('screens.cameras.call.push') : t('screens.cameras.call.call');

  return (
    <Panel
      title={title}
      description={status}
      className={className}
      action={
        snapshot.latencyMs != null && live ? (
          <Text variant="micro">{t('screens.cameras.call.latency', { ms: String(snapshot.latencyMs) })}</Text>
        ) : null
      }>
      <View className="gap-3">
        {snapshot.listening ? (
          <LevelMeter icon="volume-2" label={t('screens.cameras.call.camera-level')} level={snapshot.cameraLevel} />
        ) : null}
        {canTalk ? (
          <LevelMeter icon="mic" label={t('screens.cameras.call.mic-level')} level={snapshot.micLevel} />
        ) : null}
        {notice ? (
          <Text variant="caption" className="bg-surface-secondary rounded-2xl px-3 py-2">
            {notice}
          </Text>
        ) : null}
        {pushMode && canTalk && blockedReason == null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('screens.cameras.call.hold')}
            onPressIn={controls.press}
            onPressOut={controls.release}
            className={cn(
              'h-16 flex-row items-center justify-center gap-2 rounded-2xl',
              snapshot.talking ? 'bg-accent' : 'bg-interactive',
            )}>
            <Icon name="mic" className="text-foreground-on-interactive size-5" />
            <Text className="text-foreground-on-interactive font-semibold">
              {snapshot.talking ? t('screens.cameras.call.release') : t('screens.cameras.call.hold')}
            </Text>
          </Pressable>
        ) : null}
        <View className="flex-row flex-wrap items-center justify-center gap-3">
          {!pushMode ? (
            <RoundButton
              icon={snapshot.muted ? 'mic-off' : 'mic'}
              label={snapshot.muted ? t('screens.cameras.call.unmute') : t('screens.cameras.call.mute')}
              active={snapshot.muted}
              onPress={() => controls.setMuted(!snapshot.muted)}
            />
          ) : null}
          <RoundButton
            icon={snapshot.listening ? 'volume-2' : 'volume-x'}
            label={snapshot.listening ? t('screens.cameras.call.stop-listening') : t('screens.cameras.call.listen')}
            active={!snapshot.listening}
            onPress={() => controls.setListening(!snapshot.listening)}
          />
          <RoundButton
            icon="minus"
            label={t('screens.cameras.call.volume-down')}
            onPress={() => controls.setVolume(snapshot.volume - 0.25)}
          />
          <Text variant="label" className="w-12 text-center">
            {`${Math.round(snapshot.volume * 100)}%`}
          </Text>
          <RoundButton
            icon="plus"
            label={t('screens.cameras.call.volume-up')}
            onPress={() => controls.setVolume(snapshot.volume + 0.25)}
          />
          <RoundButton icon="phone-off" label={t('screens.cameras.call.end')} danger onPress={controls.end} />
        </View>
      </View>
    </Panel>
  );
}
