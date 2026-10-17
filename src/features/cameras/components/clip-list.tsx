import { Pressable, View } from 'react-native';
import type { ICameraClip } from '@/core/interfaces';
import type { CameraRecordMode } from '@/core/types';
import { clipRowSubtitle } from '@/features/cameras/model/camera-clips';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type ClipListProps = {
  clips: readonly ICameraClip[];
  recordMode: CameraRecordMode;
  status: 'idle' | 'loading' | 'ready' | 'failed';
  playable: boolean;
  removable: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  activeClipId: string | null;
  onOpen: (clip: ICameraClip) => void;
  onDelete: (clip: ICameraClip) => void;
  onLoadMore: () => void;
  className?: string;
};

export function ClipList({
  clips,
  recordMode,
  status,
  playable,
  removable,
  hasMore,
  loadingMore,
  activeClipId,
  onOpen,
  onDelete,
  onLoadMore,
  className,
}: ClipListProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const records = recordMode !== 'off';

  return (
    <Panel title={t('screens.cameras.clips.title')} count={clips.length} className={className}>
      {!playable || !records ? (
        <EmptyState
          variant="panel"
          icon="video"
          title={t('screens.cameras.clips.unavailable')}
          hint={t('screens.cameras.clips.unavailable-hint')}
        />
      ) : clips.length === 0 ? (
        <EmptyState
          variant="panel"
          icon="clock"
          title={status === 'loading' ? t('screens.cameras.clips.loading') : t('screens.cameras.clips.empty')}
          hint={t('screens.cameras.clips.empty-hint')}
        />
      ) : (
        <View className="gap-1">
          {clips.map((clip) => (
            <Pressable
              key={clip.id}
              accessibilityRole="button"
              accessibilityLabel={t('screens.cameras.clips.play')}
              onPress={() => onOpen(clip)}
              className={cn(
                'web:hover:bg-surface-secondary -mx-2 flex-row items-center gap-2.5 rounded-xl px-2 py-1.5 active:opacity-70',
                activeClipId === clip.id ? 'bg-surface-secondary' : undefined,
              )}>
              <View className="bg-surface-secondary size-9 items-center justify-center rounded-full">
                <Icon name="play" className="text-foreground size-4" />
              </View>
              <View className="min-w-0 flex-1">
                <Text variant="label" numberOfLines={1}>
                  {date.formatTime(new Date(clip.startedAt * 1000))}
                </Text>
                <Text variant="micro" numberOfLines={1}>
                  {clipRowSubtitle(t, clip, date.formatDayMonth(new Date(clip.startedAt * 1000)))}
                </Text>
              </View>
              {removable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('screens.cameras.clips.delete')}
                  onPress={() => onDelete(clip)}
                  hitSlop={6}
                  className="size-8 items-center justify-center rounded-full active:opacity-60">
                  <Icon name="trash" className="text-error-strong size-4" />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
          {hasMore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('screens.cameras.clips.more')}
              onPress={onLoadMore}
              disabled={loadingMore}
              className="mt-1 items-center rounded-xl py-2 active:opacity-70">
              <Text variant="caption">{t('screens.cameras.clips.more')}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Panel>
  );
}
