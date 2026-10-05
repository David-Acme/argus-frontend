import { useMemo } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { VisitorDetail } from '@/core/types';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { TimelineItem } from '@/shared/components/ui/timeline';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';

type VisitorVisitsPanelProps = {
  visitor: VisitorDetail;
  cameras: readonly ICameraCacheRow[];
  className?: string;
};

export function VisitorVisitsPanel({ visitor, cameras, className }: VisitorVisitsPanelProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const cameraNames = useMemo(() => new Map(cameras.map((camera) => [camera.id, camera.name])), [cameras]);

  return (
    <Panel title={t('screens.visitors.visits-title')} count={visitor.visitCount} className={className}>
      {visitor.visits.length === 0 ? (
        <EmptyState variant="inline" icon="history" title={t('screens.visitors.pattern-none')} />
      ) : (
        visitor.visits.map((visit, index) => {
          const at = new Date(visit.startedAt * 1000);
          const camera =
            cameraNames.get(String(visit.cameraId)) ??
            t('screens.visitors.unknown-camera', { id: String(visit.cameraId) });
          return (
            <TimelineItem
              key={visit.id}
              last={index === visitor.visits.length - 1}
              dotClassName={visitor.category === 'watchlist' ? 'bg-error' : undefined}>
              <Text variant="label">
                {t('screens.visitors.visit-row', {
                  camera,
                  when: `${dates.formatDayMonth(at)} · ${dates.formatTime(at)}`,
                })}
              </Text>
              {visit.sightings > 1 ? (
                <Text variant="caption">
                  {t('screens.visitors.visit-sightings', { count: String(visit.sightings) })}
                </Text>
              ) : null}
            </TimelineItem>
          );
        })
      )}
    </Panel>
  );
}
