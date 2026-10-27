import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import type { InfoRow } from '@/features/auth/model/info-row';

export type InfoRowsProps = { rows: readonly InfoRow[] };

export function InfoRows({ rows }: InfoRowsProps) {
  const { t } = useTranslation();
  return (
    <Section>
      {rows.map((row) => (
        <Row
          key={row.key}
          title={t(row.title)}
          meta={t(row.meta)}
          leading={<Avatar icon={row.icon} tone={row.done ? 'ok' : 'default'} />}
        />
      ))}
    </Section>
  );
}
