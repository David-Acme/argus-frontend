import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { VisitorGrid } from '@/features/visitors/components/visitor-grid';
import { VisitorRecognitionOff } from '@/features/visitors/components/visitor-recognition-off';
import { VISITOR_PREVIEW_COUNT } from '@/features/visitors/constants';
import { useVisitors } from '@/features/visitors/hooks/use-visitors';

type VisitorsPreviewPanelProps = {
  className?: string;
};

export function VisitorsPreviewPanel({ className }: VisitorsPreviewPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { list, reload } = useVisitors();
  const recent = useMemo(() => (list?.visitors ?? []).slice(0, VISITOR_PREVIEW_COUNT), [list]);

  if (list && !list.recognitionEnabled && list.visitors.length === 0) {
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
          oneRow
          onPress={(visitor) => router.push(`/users/visitors/${visitor.id}`)}
        />
      )}
      {list && !list.recognitionEnabled && list.visitors.length > 0 ? (
        <Text variant="caption">{t('screens.visitors.off-title')}</Text>
      ) : null}
    </Panel>
  );
}
