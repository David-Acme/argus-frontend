import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTranslation } from '@/shared/hooks/use-translation';
import { motion } from '@/shared/theme';
import { Menu, type MenuItems } from '@/shared/ui/menu';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { MediaControlButton } from '../media-parts';
import { PLAYER_SPEEDS, formatPlayerTime } from './player-model';
import { PlayerScrubber } from './player-scrubber';
import type { PlayerState } from './use-player';

export type PlayerChromeProps = {
  player: PlayerState;
  title?: string;
  subtitle?: string;
  fullscreen: boolean;
  onFullscreen: () => void;
  onClose?: () => void;
};

type ChromePartProps = { player: PlayerState };

const PASS_THROUGH = { pointerEvents: 'box-none' } as const;

const INERT = { pointerEvents: 'none' } as const;

function useSpeedItems(player: PlayerState): MenuItems {
  const { t } = useTranslation();
  const [first, ...rest] = PLAYER_SPEEDS.map((speed) => ({
    label:
      speed === 1
        ? t('common.player.speed-normal')
        : t('common.player.speed', { speed: `${speed}×` }),
    icon: speed === player.speed ? ('check' as const) : ('clock' as const),
    family: 'view' as const,
    onPress: () => player.setSpeed(speed),
  }));
  return first ? [first, ...rest] : [{ label: '1×', icon: 'clock', onPress: () => undefined }];
}

function CentreControl({ player }: ChromePartProps) {
  const { t } = useTranslation();
  if (player.status === 'loading' || player.status === 'error') return null;
  const ended = player.status === 'ended';
  const playing = player.status === 'playing';
  return (
    <MediaControlButton
      large
      icon={ended ? 'refresh' : playing ? 'pause' : 'play'}
      label={t(
        ended ? 'common.player.replay' : playing ? 'common.player.pause' : 'common.player.play'
      )}
      onPress={player.toggle}
    />
  );
}

function TimeLabel({ player }: ChromePartProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(false);
  const { positionMs, durationMs } = player.times;
  const total = remaining
    ? t('common.player.remaining', { time: formatPlayerTime(durationMs - positionMs) })
    : formatPlayerTime(durationMs);
  return (
    <PressableSurface
      a11y={{
        label: t(remaining ? 'common.player.show-total' : 'common.player.show-remaining'),
        role: 'button',
      }}
      onPress={() => setRemaining((current) => !current)}>
      <Text variant="mediaLabel" tone="on-media">
        {`${formatPlayerTime(positionMs)} / ${total}`}
      </Text>
    </PressableSurface>
  );
}

function BottomBar({ player, fullscreen, onFullscreen }: Omit<PlayerChromeProps, 'title'>) {
  const { t } = useTranslation();
  const { positionMs, durationMs } = player.times;
  return (
    <View className="px-overlay-edge pb-overlay-edge gap-1" style={PASS_THROUGH}>
      <PlayerScrubber
        times={player.times}
        copy={{
          label: t('common.player.position'),
          value: t('common.player.position-value', {
            elapsed: formatPlayerTime(positionMs),
            total: formatPlayerTime(durationMs),
          }),
        }}
        onScrubbing={player.controls.setScrubbing}
        onSeek={player.seekTo}
        onStep={player.seekBy}
      />
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          <TimeLabel player={player} />
        </View>
        {player.audioLost ? (
          <Text variant="mediaDetail" tone="on-media">
            {t('common.player.no-audio')}
          </Text>
        ) : (
          <MediaControlButton
            icon={player.muted ? 'mute' : 'speaker'}
            label={t(player.muted ? 'common.player.unmute' : 'common.player.mute')}
            onPress={player.toggleMute}
          />
        )}
        <MediaControlButton
          icon={fullscreen ? 'min' : 'max'}
          label={t(fullscreen ? 'common.player.exit-fullscreen' : 'common.player.fullscreen')}
          onPress={onFullscreen}
        />
      </View>
    </View>
  );
}

function TopBar({
  player,
  title,
  subtitle,
  fullscreen,
  onClose,
}: Omit<PlayerChromeProps, 'onFullscreen'>) {
  const { t } = useTranslation();
  const items = useSpeedItems(player);
  return (
    <View
      className="px-overlay-edge pt-overlay-edge flex-row items-center gap-2"
      style={PASS_THROUGH}>
      {fullscreen && onClose ? (
        <MediaControlButton icon="x" label={t('common.player.close')} onPress={onClose} />
      ) : null}
      <View className="min-w-0 flex-1">
        {fullscreen && title ? (
          <Text variant="mediaLabel" tone="on-media" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {fullscreen && subtitle ? (
          <Text variant="mediaDetail" tone="on-media" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Menu label={t('common.player.settings')} items={items} item />
    </View>
  );
}

export function PlayerChrome(props: PlayerChromeProps) {
  const { shown } = props.player.controls;
  const fade = useAnimatedStyle(() => ({
    opacity: withTiming(shown ? 1 : 0, { duration: motion.duration.base }),
  }));
  return (
    <Animated.View
      className="absolute inset-0 justify-between"
      style={[fade, shown ? PASS_THROUGH : INERT]}>
      <TopBar {...props} />
      <View className="absolute inset-0 items-center justify-center" style={PASS_THROUGH}>
        <CentreControl player={props.player} />
      </View>
      <BottomBar {...props} />
    </Animated.View>
  );
}
