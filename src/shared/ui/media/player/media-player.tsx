import { clsx } from 'clsx';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useAnnounce } from '@/shared/hooks/use-announce';
import { useTranslation } from '@/shared/hooks/use-translation';
import { illustration, layout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/resource-view';
import { Text } from '@/shared/ui/text';
import { MediaFrame } from '../media-frame';
import { PlayerChrome } from './player-chrome';
import { FULLSCREEN_ADOPTS, PlayerFullscreen } from '@/shared/ui/media/player/player-fullscreen';
import { PlayerGestures } from './player-gestures';
import { isBuffering, loadingLook, streakSeconds } from './player-model';
import { PlayerSpinner, SeekRipple } from './player-parts';
import { usePlayer, type PlayerState } from './use-player';
import { VideoSurface } from '@/shared/ui/media/player/video-surface';
import type { PlayerSource, SurfaceHandle } from './video-surface-types';

export type MediaPlayerProps = {
  source: PlayerSource | null;
  failed?: boolean;
  poster?: string;
  title?: string;
  subtitle?: string;
  autoPlay?: boolean;
  startMuted?: boolean;
  onEnded?: () => void;
  onClose?: () => void;
  onRetry?: () => void;
};

type BodyProps = {
  player: PlayerState;
  view: Pick<
    MediaPlayerProps,
    'source' | 'failed' | 'poster' | 'title' | 'subtitle' | 'autoPlay' | 'onRetry'
  >;
  fullscreen: boolean;
  adopt: boolean;
  onFullscreen: () => void;
  onClose?: () => void;
};

const INLINE = { aspectRatio: layout.mediaAspect, backgroundColor: illustration.media };

const FILLED = { flex: 1, backgroundColor: illustration.sceneShade };

function PlayerFailure({ onRetry }: Pick<MediaPlayerProps, 'onRetry'>) {
  const { t } = useTranslation();
  return (
    <View role="alert" className="absolute inset-0 items-center justify-center gap-3 p-4">
      <Text variant="mediaLabel" tone="on-media" align="center">
        {t('common.player.failed')}
      </Text>
      {onRetry ? <Button compact glass label={t('common.player.retry')} onPress={onRetry} /> : null}
    </View>
  );
}

function PlayerBody({ player, view, fullscreen, adopt, onFullscreen, onClose }: BodyProps) {
  const { t } = useTranslation();
  const look = loadingLook({ painted: player.painted, poster: Boolean(view.poster) });
  const failed = Boolean(view.failed) || player.status === 'error';
  return (
    <>
      {look === 'poster' && view.poster ? <MediaFrame source={{ uri: view.poster }} /> : null}
      {look === 'skeleton' && !failed ? <Skeleton shape="media" /> : null}
      {view.source && !failed ? (
        <VideoSurface
          source={view.source}
          adopt={adopt}
          autoPlay={view.autoPlay ?? true}
          muted={player.muted}
          events={player.events}
        />
      ) : null}
      {failed ? (
        <PlayerFailure onRetry={view.onRetry} />
      ) : (
        <>
          <PlayerGestures player={player} />
          {player.streak ? (
            <SeekRipple
              streak={player.streak}
              label={t('common.player.seconds', { count: String(streakSeconds(player.streak)) })}
            />
          ) : null}
          <PlayerSpinner
            shown={isBuffering(player.status, player.painted)}
            label={t('common.player.buffering')}
          />
          {view.source ? (
            <PlayerChrome
              player={player}
              title={view.title}
              subtitle={view.subtitle}
              fullscreen={fullscreen}
              onFullscreen={onFullscreen}
              onClose={onClose}
            />
          ) : null}
        </>
      )}
    </>
  );
}

export function MediaPlayer({ onEnded, onClose, startMuted = false, ...view }: MediaPlayerProps) {
  const { t } = useTranslation();
  const player = usePlayer({ source: view.source, startMuted, onEnded });
  const [fullscreen, setFullscreen] = useState(false);
  const inline = useRef<SurfaceHandle | null>(null);
  const loading = !player.painted && !view.failed ? t('common.player.loading') : undefined;
  useAnnounce(loading);
  const inlineEvents = {
    ...player.events,
    onReady: (handle: SurfaceHandle) => {
      inline.current = handle;
      player.events.onReady(handle);
    },
  };
  const exit = () => {
    if (FULLSCREEN_ADOPTS && inline.current) {
      inline.current.reclaim();
      player.events.onReady(inline.current);
    }
    setFullscreen(false);
  };
  const toggleFullscreen = () => (fullscreen ? exit() : setFullscreen(true));
  const close = fullscreen ? exit : onClose;
  const inlinePlayer = { ...player, events: inlineEvents };
  const covering = fullscreen && !FULLSCREEN_ADOPTS;
  return (
    <View
      role="region"
      aria-label={view.title}
      className={clsx(
        'overflow-hidden',
        covering ? 'web:fixed absolute inset-0 z-50' : 'rounded-media'
      )}
      style={covering ? FILLED : INLINE}>
      <PlayerBody
        player={inlinePlayer}
        view={view}
        fullscreen={covering}
        adopt={false}
        onFullscreen={toggleFullscreen}
        onClose={close}
      />
      {FULLSCREEN_ADOPTS ? (
        <PlayerFullscreen open={fullscreen} onExit={exit}>
          <PlayerBody
            player={player}
            view={view}
            fullscreen
            adopt
            onFullscreen={toggleFullscreen}
            onClose={close}
          />
        </PlayerFullscreen>
      ) : (
        <PlayerFullscreen open={fullscreen} onExit={exit}>
          {null}
        </PlayerFullscreen>
      )}
    </View>
  );
}
