import type { VisitorSettings } from '@/core/types';
import { Panel } from '@/shared/components/ui/panel';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { VISITOR_RETENTION_STEPS } from '@/features/visitors/constants';

type VisitorRetentionPanelProps = {
  settings: VisitorSettings | null;
  onChange: (days: number) => void;
  className?: string;
};

export function VisitorRetentionPanel({ settings, onChange, className }: VisitorRetentionPanelProps) {
  const { t } = useTranslation();
  const current = settings?.unnamedRetentionDays ?? 30;
  const steps = VISITOR_RETENTION_STEPS.includes(current)
    ? VISITOR_RETENTION_STEPS
    : [...VISITOR_RETENTION_STEPS, current].sort((left, right) => left - right);

  return (
    <Panel
      title={t('screens.visitors.retention-title')}
      description={t('screens.visitors.retention-description')}
      className={className}>
      <SegmentedControl
        accessibilityLabel={t('screens.visitors.retention-title')}
        options={steps.map((days) => ({ value: String(days), label: String(days) }))}
        value={String(current)}
        onChange={(value) => onChange(Number(value))}
      />
      <Text variant="caption">{t('screens.visitors.privacy-note')}</Text>
    </Panel>
  );
}
