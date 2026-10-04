import { Pressable, View } from 'react-native';
import type { ICameraDetection } from '@/core/interfaces';
import { formatRelative, objectLabelKey, relativeTime } from '@/features/cameras/model/camera-overview';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type RecentDetectionsProps = {
  events: readonly ICameraDetection[];
  cameraNames: ReadonlyMap<string, string>;
  now: number;
  readable: boolean;
  limit?: number;
  className?: string;
  onOpen: (cameraId: string) => void;
};

const SEVERITY_DOT: Record<string, string> = {
  info: 'bg-border',
  warning: 'bg-warning',
  critical: 'bg-error',
};

export function RecentDetections({
  events,
  cameraNames,
  now,
  readable,
  limit = 12,
  className,
  onOpen,
}: RecentDetectionsProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const visible = events.filter((event) => cameraNames.has(String(event.cameraId))).slice(0, limit);

  return (
    <Panel title={t('screens.cameras.detections.title')} count={visible.length} className={className}>
      {visible.length === 0 ? (
        <EmptyState
          variant="panel"
          icon="activity"
          title={readable ? t('screens.cameras.detections.empty') : t('screens.cameras.detections.private')}
          hint={readable ? t('screens.cameras.detections.empty-hint') : undefined}
        />
      ) : (
        <View className="gap-1">
          {visible.map((event) => {
            const cameraId = String(event.cameraId);
            const when = relativeTime(event.at, now);
            const at = new Date(event.at);
            return (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                onPress={() => onOpen(cameraId)}
                className="web:hover:bg-surface-secondary -mx-2 flex-row gap-2.5 rounded-xl px-2 py-1.5 active:opacity-70">
                <View className={cn('mt-1.5 size-2 shrink-0 rounded-full', SEVERITY_DOT[event.severity] ?? 'bg-border')} />
                <View className="min-w-0 flex-1">
                  <Text variant="label" numberOfLines={1}>
                    {[t(objectLabelKey(event.label)), event.zoneName].filter(Boolean).join(' · ')}
                  </Text>
                  <Text variant="micro" numberOfLines={1}>
                    {[cameraNames.get(cameraId), formatRelative(t, when), date.formatTime(at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Panel>
  );
}
