import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { VisitorGrid } from '@/features/visitors/components/visitor-grid';
import { VisitorRecognitionOff } from '@/features/visitors/components/visitor-recognition-off';
import { VISITOR_PREVIEW_COUNT } from '@/features/visitors/constants';
import type { VisitorQuery } from '@/features/visitors/model/visitor';
import { useVisitorFeed, useVisitors } from '@/features/visitors/hooks/use-visitors';

type VisitorsPreviewPanelProps = {
  className?: string;
};

const ALL_VISITORS: VisitorQuery = { filter: 'all', search: '' };

export function VisitorsPreviewPanel({ className }: VisitorsPreviewPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, reload } = useVisitors();
  const feed = useVisitorFeed(ALL_VISITORS);
  const recent = useMemo(() => feed.rows.slice(0, VISITOR_PREVIEW_COUNT), [feed.rows]);
  const recognitionOff = settings != null && !settings.recognitionEnabled;

  if (recognitionOff && recent.length === 0) {
    return (
      <Panel className={className}>
        <VisitorRecognitionOff variant="inline" onEnabled={() => void reload()} />
      </Panel>
    );
  }

  return (
    <Panel className={className}>
      {recent.length === 0 ? (
        <EmptyState
          variant="inline"
          icon="scan-face"
          title={t('screens.visitors.empty-title')}
          hint={t('screens.visitors.empty-description')}
        />
      ) : (
        <VisitorGrid
          id="visitors-preview"
          visitors={recent}
          onPress={(visitor) => router.push(`/users/visitors/${visitor.id}`)}
        />
      )}
      {recognitionOff && recent.length > 0 ? (
        <Text variant="caption">{t('screens.visitors.off-title')}</Text>
      ) : null}
    </Panel>
  );
}
