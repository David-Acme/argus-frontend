import { ActivityIndicator, View } from 'react-native';
import type { CameraStreamState, IconName, TranslationKey } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

export type CameraLiveState = CameraStreamState | 'unsupported' | 'disabled';

type CameraLiveStatusProps = {
  state: CameraLiveState;
  painted: boolean;
  onRetry?: () => void;
};

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

export function CameraLiveStatus({ state, painted, onRetry }: CameraLiveStatusProps) {
  const { t } = useTranslation();
  const picture = painted && (state === 'live' || state === 'reconnecting' || state === 'connecting');
  const placeholder = PLACEHOLDERS[state];

  if (picture) {
    return (
      <View pointerEvents="none" className="absolute left-3 top-3">
        {state === 'live' ? (
          <StatusBadge
            surface="card"
            label={t('screens.cameras.live.live')}
            dotClassName="bg-error"
            textClassName="text-foreground font-semibold"
          />
        ) : (
          <StatusBadge
            surface="card"
            label={t('screens.cameras.live.reconnecting')}
            dotClassName="bg-warning"
          />
        )}
      </View>
    );
  }

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
