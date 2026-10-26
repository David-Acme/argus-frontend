import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';

export function ZoneGuide() {
  const { t } = useTranslation();
  return (
    <Section title={t('screens.cameras.guide.zones')}>
      <Row
        leading={<Avatar icon="grid" />}
        title={t('screens.cameras.zone-monitor')}
        meta={t('screens.cameras.guide.zone-monitor')}
      />
      <Row
        leading={<Avatar icon="alert" tone="attn" />}
        title={t('screens.cameras.zone-alert')}
        meta={t('screens.cameras.guide.zone-alert')}
      />
      <Row
        leading={<Avatar icon="eyeoff" />}
        title={t('screens.cameras.zone-exclude')}
        meta={t('screens.cameras.guide.zone-exclude')}
      />
      <Row
        leading={<Avatar icon="lock" />}
        title={t('screens.cameras.zone-privacy')}
        meta={t('screens.cameras.zone-privacy-hint')}
      />
    </Section>
  );
}
