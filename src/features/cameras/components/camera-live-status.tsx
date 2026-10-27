import { ActivityIndicator, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { CameraLiveNotice, CameraStreamState, IconName, TranslationKey } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { liveStatusSpot } from '@/features/cameras/model/camera-live-spot';

export type CameraLiveState = CameraStreamState | 'unsupported' | 'disabled';

type CameraLiveStatusProps = {
  state: CameraLiveState;
  painted: boolean;
  notice?: CameraLiveNotice | null;
  compact?: boolean;
  hidden?: boolean;
  insets?: EdgeInsets;
  onRetry?: () => void;
};

const PILL_MARGIN = 12;

const RECONNECTING_DOT = 'bg-warning';

const LIVE_DOT = 'bg-error';

const LIVE_TEXT = 'text-foreground font-semibold';

const CENTER_ID = 'camera-live-center';

const CORNER_ID = 'camera-live-corner';

type CenterPillProps = { picture: boolean; placeholder: Placeholder };

type CornerPillProps = { live: boolean; corner?: { top: number; left: number } };

type Placeholder = {
  icon: IconName | null;
  title: TranslationKey;
  hint?: TranslationKey;
  retry?: boolean;
};

const PLACEHOLDERS: Record<CameraLiveState, Placeholder> = {
  connecting: {
    icon: null,
    title: 'screens.cameras.live.connecting',
    hint: 'screens.cameras.live.connecting-hint',
  },
  live: { icon: null, title: 'screens.cameras.live.connecting' },
  reconnecting: { icon: null, title: 'screens.cameras.live.reconnecting' },
  offline: {
    icon: 'wifi-off',
    title: 'screens.cameras.live.offline',
    hint: 'screens.cameras.live.offline-hint',
    retry: true,
  },
  unavailable: {
    icon: 'triangle-alert',
    title: 'screens.cameras.live.unavailable',
    hint: 'screens.cameras.live.unavailable-hint',
  },
  unsupported: {
    icon: 'monitor',
    title: 'screens.cameras.live-unsupported',
    hint: 'screens.cameras.live.unsupported-hint',
  },
  disabled: {
    icon: 'video',
    title: 'screens.cameras.live.disabled',
    hint: 'screens.cameras.live.disabled-hint',
  },
  closed: { icon: 'video', title: 'screens.cameras.live.connecting' },
};

const NOTICES: Record<CameraLiveNotice, Placeholder> = {
  'camera-disabled': {
    icon: 'video',
    title: 'screens.cameras.live.notice.disabled',
    hint: 'screens.cameras.live.notice.disabled-hint',
  },
  'viewers-total': {
    icon: 'users',
    title: 'screens.cameras.live.notice.viewers-total',
    hint: 'screens.cameras.live.notice.viewers-total-hint',
  },
  'viewers-camera': {
    icon: 'users',
    title: 'screens.cameras.live.notice.viewers-camera',
    hint: 'screens.cameras.live.notice.viewers-camera-hint',
  },
  'viewers-user': {
    icon: 'layout-grid',
    title: 'screens.cameras.live.notice.viewers-user',
    hint: 'screens.cameras.live.notice.viewers-user-hint',
  },
  'session-ended': {
    icon: 'log-out',
    title: 'screens.cameras.live.notice.session-ended',
    hint: 'screens.cameras.live.notice.session-ended-hint',
  },
};

function CenterPill({ picture, placeholder }: CenterPillProps) {
  const { t } = useTranslation();
  return (
    <View
      testID={CENTER_ID}
      pointerEvents="none"
      className={cn('absolute inset-0 items-center justify-center p-3', !picture && 'bg-surface-secondary')}>
      <StatusBadge
        surface="card"
        label={t(picture ? 'screens.cameras.live.reconnecting' : placeholder.title)}
        icon={picture ? undefined : (placeholder.icon ?? undefined)}
        dotClassName={picture ? RECONNECTING_DOT : undefined}
        className="max-w-full self-center"
      />
    </View>
  );
}

function CornerPill({ live, corner }: CornerPillProps) {
  const { t } = useTranslation();
  return (
    <View
      testID={CORNER_ID}
      pointerEvents="none"
      className={cn('absolute', corner ? undefined : 'left-3 top-3')}
      style={corner}>
      {live ? (
        <StatusBadge
          surface="card"
          label={t('screens.cameras.live.live')}
          dotClassName={LIVE_DOT}
          textClassName={LIVE_TEXT}
        />
      ) : (
        <StatusBadge surface="card" label={t('screens.cameras.live.reconnecting')} dotClassName={RECONNECTING_DOT} />
      )}
    </View>
  );
}

function placeholderFor(state: CameraLiveState, notice: CameraLiveNotice | null | undefined): Placeholder {
  if (notice && state !== 'unsupported' && state !== 'disabled') return NOTICES[notice];
  return PLACEHOLDERS[state];
}

export function CameraLiveStatus({
  state,
  painted,
  notice,
  compact = false,
  hidden = false,
  insets,
  onRetry,
}: CameraLiveStatusProps) {
  const { t } = useTranslation();
  const picture = painted && (state === 'live' || state === 'reconnecting' || state === 'connecting');
  const placeholder = placeholderFor(state, notice);
  const corner = insets ? { top: PILL_MARGIN + insets.top, left: PILL_MARGIN + insets.left } : undefined;
  const spot = liveStatusSpot({ picture, live: state === 'live', compact, hidden });

  if (spot === 'none') return null;

  if (spot === 'center') return <CenterPill picture={picture} placeholder={placeholder} />;

  if (spot === 'corner') return <CornerPill live={state === 'live'} corner={corner} />;

  return (
    <View className="bg-surface-secondary absolute inset-0 items-center justify-center gap-3 p-6">
      <View className="bg-card size-14 items-center justify-center rounded-full shadow-sm shadow-black/[0.05]">
        {placeholder.icon ? (
          <Icon name={placeholder.icon} className="text-muted-foreground size-6" />
        ) : (
          <ActivityIndicator accessibilityLabel={t(placeholder.title)} />
        )}
      </View>
      <View className="max-w-sm items-center gap-1">
        <Text variant="label" className="text-center">
          {t(placeholder.title)}
        </Text>
        {placeholder.hint ? (
          <Text variant="caption" className="text-center">
            {t(placeholder.hint)}
          </Text>
        ) : null}
      </View>
      {placeholder.retry && onRetry ? (
        <Button variant="outline" size="sm" onPress={onRetry}>
          <Icon name="refresh-cw" className="text-foreground size-4" />
          <Text>{t('screens.cameras.live.retry')}</Text>
        </Button>
      ) : null}
    </View>
  );
}
