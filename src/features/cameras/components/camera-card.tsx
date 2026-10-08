import { memo, useCallback, useState, type ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { CameraDriverKind, CameraFormFactor, CameraStreamState, TranslationKey } from '@/core/types';
import { CameraLiveView } from './camera-live-view';
import { CAMERA_PREVIEW_TRANSPORT, previewPaints } from '@/features/cameras/model/camera-preview';
import { CameraIllustration } from '@/features/cameras/components/camera-illustration';
import {
  formatRelative,
  healthOf,
  objectLabelKey,
  relativeTime,
  streamSummary,
  type CameraView,
} from '@/features/cameras/model/camera-overview';
import { HEALTH_LABEL, STATUS_DOT, STATUS_LABEL, STATUS_TEXT, healthNeedsAttention } from '@/features/cameras/model/camera-status';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

export type CameraCardVariant = 'grid' | 'featured' | 'row';

type CameraCardProps = {
  view: CameraView;
  variant: CameraCardVariant;
  formFactor: CameraFormFactor;
  canTalk: boolean;
  now: number;
  pending?: boolean;
  thumbnail?: string;
  livePreview?: boolean;
  badge?: ReactNode;
  onPress: (id: string) => void;
  onTalk: (id: string) => void;
};

type PreviewProps = {
  view: CameraView;
  formFactor: CameraFormFactor;
  thumbnail?: string;
  live?: boolean;
  compact?: boolean;
};

type FactProps = {
  icon: 'clock' | 'activity' | 'video' | 'eye' | 'shield';
  text: string;
  tone?: 'muted' | 'strong' | 'warning';
};

type CameraFactsProps = {
  view: CameraView;
  now: number;
};

const PREVIEW_ASPECT = 16 / 9;

const DRIVER_LABEL = {
  tapo: 'screens.cameras.driver-tapo',
  onvif: 'screens.cameras.driver-onvif',
  rtsp: 'screens.cameras.driver-rtsp',
} as const satisfies Record<CameraDriverKind, TranslationKey>;

const PREVIEW_LABEL = {
  online: 'screens.cameras.preview-hint',
  offline: 'screens.cameras.preview-offline',
  disabled: 'screens.cameras.preview-disabled',
} as const satisfies Record<CameraView['status'], TranslationKey>;

function Fact({ icon, text, tone = 'muted' }: FactProps) {
  return (
    <View className="min-w-0 flex-row items-center gap-1.5">
      <Icon
        name={icon}
        className={cn('size-3.5', tone === 'warning' ? 'text-warning-strong' : 'text-muted-foreground')}
      />
      <Text
        variant="caption"
        numberOfLines={1}
        className={cn(
          'min-w-0 shrink',
          tone === 'strong' && 'text-foreground-secondary',
          tone === 'warning' && 'text-warning-strong',
        )}>
        {text}
      </Text>
    </View>
  );
}

function Preview({ view, formFactor, thumbnail, live = false, compact = false }: PreviewProps) {
  const { t } = useTranslation();
  const { camera, status } = view;
  const health = healthOf(view.live);
  const viewers = view.live?.viewers ?? 0;
  const streaming = live && status === 'online';
  const [painted, setPainted] = useState(false);
  const onState = useCallback((state: CameraStreamState) => setPainted(previewPaints(state)), []);
  return (
    <View
      className={cn(
        'bg-surface-secondary dark:bg-card-secondary w-full items-center justify-center overflow-hidden',
        compact ? 'rounded-xl' : 'rounded-2xl',
      )}
      style={{ aspectRatio: PREVIEW_ASPECT }}>
      {thumbnail && status === 'online' ? (
        <Image
          source={{ uri: thumbnail }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <View className={cn('items-center', compact ? 'gap-0' : 'gap-1.5', status !== 'online' && 'opacity-60')}>
          <CameraIllustration formFactor={formFactor} size={compact ? 52 : 92} />
          {compact ? null : (
            <Text variant="micro" numberOfLines={1}>
              {t(PREVIEW_LABEL[status])}
            </Text>
          )}
        </View>
      )}
      {streaming ? (
        <View pointerEvents="none" className="absolute inset-0" style={{ opacity: painted ? 1 : 0 }}>
          <CameraLiveView
            cameraId={camera.id}
            quality="sub"
            transport={CAMERA_PREVIEW_TRANSPORT.policy}
            isolatedBackoff={CAMERA_PREVIEW_TRANSPORT.isolatedBackoff}
            fill
            compactStatus
            onState={onState}
          />
        </View>
      ) : null}
      {compact ? null : (
        <>
          <StatusBadge
            label={t(STATUS_LABEL[status])}
            surface="card"
            dotClassName={STATUS_DOT[status]}
            className="absolute left-3 top-3"
            textClassName={STATUS_TEXT[status]}
          />
          {status === 'online' && healthNeedsAttention(health) ? (
            <StatusBadge
              label={t(HEALTH_LABEL[health])}
              icon="triangle-alert"
              surface="card"
              iconClassName="text-warning-strong"
              textClassName="text-warning-strong"
              className="absolute right-3 top-3"
            />
          ) : null}
          {viewers > 0 ? (
            <StatusBadge
              label={String(viewers)}
              icon="eye"
              surface="card"
              className="absolute bottom-3 left-3"
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function CameraFacts({ view, now }: CameraFactsProps) {
  const { t } = useTranslation();
  const { live, lastEvent, status } = view;
  const seen = relativeTime(live?.lastSeenAt ?? 0, now);
  const seenText =
    status === 'disabled'
      ? t('screens.cameras.card.paused')
      : seen
        ? t('screens.cameras.card.seen', { when: formatRelative(t, seen) })
        : t('screens.cameras.card.not-seen');
  const event = lastEvent ? relativeTime(lastEvent.at, now) : null;
  const eventText = lastEvent
    ? [
        t(objectLabelKey(lastEvent.label)),
        lastEvent.zoneName,
        formatRelative(t, event),
      ]
        .filter(Boolean)
        .join(' · ')
    : t('screens.cameras.card.no-events');
  const stream = streamSummary(live);

  return (
    <View className="gap-1">
      <Fact icon="clock" text={seenText} tone={status === 'offline' ? 'warning' : 'muted'} />
      <Fact icon="activity" text={eventText} tone={lastEvent ? 'strong' : 'muted'} />
      {stream ? <Fact icon="video" text={stream} /> : null}
    </View>
  );
}

export const CameraCard = memo(function CameraCard({
  view,
  variant,
  formFactor,
  canTalk,
  now,
  pending = false,
  thumbnail,
  livePreview = false,
  badge,
  onPress,
  onTalk,
}: CameraCardProps) {
  const { t } = useTranslation();
  const { isCompact, isExpanded } = useWindowClass();
  const { camera, status } = view;
  const statusLabel = t(STATUS_LABEL[status]);
  const subtitle = [camera.modelLabel, t(DRIVER_LABEL[camera.driver])].filter(Boolean).join(' · ');
  const zonesLabel =
    camera.zones.length === 1
      ? t('screens.cameras.zones-count-one')
      : t('screens.cameras.zones-count', { count: String(camera.zones.length) });
  const recordLabel =
    camera.recordMode === 'continuous'
      ? t('screens.cameras.form.record-continuous')
      : t('screens.cameras.form.record-events');
  const talk =
    canTalk && status === 'online' ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('screens.cameras.call.talk-to', { name: camera.name })}
        onPress={() => onTalk(camera.id)}
        hitSlop={6}
        className="bg-surface-secondary dark:bg-card-secondary size-9 items-center justify-center rounded-full active:opacity-70">
        <Icon name="mic" className="text-foreground size-4" />
      </Pressable>
    ) : null;
  const badges = (
    <View className="flex-row flex-wrap gap-2">
      <StatusBadge icon="video" label={recordLabel} />
      <StatusBadge icon="shield" label={zonesLabel} />
      {badge}
    </View>
  );
  const pressableClass = cn(
    'bg-card rounded-3xl shadow-md shadow-black/[0.05] active:opacity-80 web:hover:opacity-95',
    pending && 'opacity-60',
  );

  if (variant === 'row') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${camera.name}, ${statusLabel}`}
        accessibilityState={{ busy: pending, disabled: pending }}
        disabled={pending}
        onPress={() => onPress(camera.id)}
        className={cn(pressableClass, 'flex-row items-center gap-3 p-2.5 pr-3')}>
        <View className="w-28 shrink-0">
          <Preview view={view} formFactor={formFactor} thumbnail={thumbnail} live={livePreview} compact />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <View className={cn('size-2 rounded-full', STATUS_DOT[status])} />
            <Text variant="label" numberOfLines={1} className="min-w-0 shrink">
              {camera.name}
            </Text>
          </View>
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {isCompact ? null : (
          <View className="min-w-0 flex-[1.4]">
            <CameraFacts view={view} now={now} />
          </View>
        )}
        {isExpanded ? badges : null}
        {talk}
        <Icon name="chevron-right" className="text-muted-foreground size-4" />
      </Pressable>
    );
  }

  const details = (
    <View className={cn('gap-2.5', variant === 'featured' ? 'min-w-0 flex-1 justify-center py-2 pr-2' : 'px-1 pb-1')}>
      <View className="flex-row items-start gap-2">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant={variant === 'featured' ? 'headline' : 'subhead'} numberOfLines={1}>
            {camera.name}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {subtitle || t('screens.cameras.device')}
          </Text>
        </View>
        {talk}
      </View>
      <CameraFacts view={view} now={now} />
      {badges}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${camera.name}, ${statusLabel}`}
      accessibilityState={{ busy: pending, disabled: pending }}
      disabled={pending}
      onPress={() => onPress(camera.id)}
      className={cn(pressableClass, variant === 'featured' ? 'flex-row items-stretch gap-5 p-3' : 'flex-1 gap-3 p-3')}>
      <View className={variant === 'featured' ? 'w-[58%]' : undefined}>
        <Preview view={view} formFactor={formFactor} thumbnail={thumbnail} live={livePreview} />
      </View>
      {details}
    </Pressable>
  );
});
