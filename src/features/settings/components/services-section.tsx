import { clsx } from 'clsx';
import { View } from 'react-native';
import type { SettingsOwner, SettingsOwnerName } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { SERVICE_LOOK } from '@/features/settings/constants/services.constant';
import { reachableCount, summaryOf } from '@/features/settings/model/services';
import type { SettingMatch } from '@/features/settings/model/services';
import { ownerName, settingText, valueText } from '@/features/settings/model/setting-text';

type ServicesSectionProps = {
  owners: readonly SettingsOwner[];
  selected: SettingsOwnerName | null;
  onOpen: (owner: SettingsOwner) => void;
};

type ResultsProps = {
  query: string;
  matches: readonly SettingMatch[];
  onOpen: (owner: SettingsOwner) => void;
};

type DotProps = { ok: boolean };

type ServiceRowProps = { owner: SettingsOwner; selected: boolean; onOpen: () => void };

const RESULTS_SHOWN = 12;

function Dot({ ok }: DotProps) {
  return <View aria-hidden className={clsx('size-dot rounded-full', ok ? 'bg-ok' : 'bg-attn')} />;
}

function useSummary(owner: SettingsOwner): string {
  const { t } = useTranslation();
  if (!owner.reachable) return t('screens.settings.services.unreachable');
  const parts = summaryOf(owner).map((setting) => valueText(setting, setting.value));
  return parts.length > 0 ? parts.join(' · ') : t(SERVICE_LOOK[owner.service].hint);
}

function ServiceRow({ owner, selected, onOpen }: ServiceRowProps) {
  const look = SERVICE_LOOK[owner.service];
  const summary = useSummary(owner);
  return (
    <Row
      leading={<Avatar icon={look.icon} tone={owner.reachable ? look.tone : 'attn'} />}
      title={ownerName(owner)}
      meta={summary}
      metaTone={owner.reachable ? undefined : 'attn'}
      trailing={<Dot ok={owner.reachable} />}
      chevron
      onPress={onOpen}
      testID={selected ? `service-row-${owner.service}-selected` : `service-row-${owner.service}`}
    />
  );
}

export function ServicesSection({ owners, selected, onOpen }: ServicesSectionProps) {
  const { t } = useTranslation();
  const active = reachableCount(owners);
  if (owners.length === 0) return null;
  return (
    <Section
      title={t('screens.settings.services.title')}
      meta={
        active === 1
          ? t('screens.settings.services.active-one')
          : t('screens.settings.services.active-many', { count: String(active) })
      }>
      {owners.map((owner) => (
        <ServiceRow
          key={owner.service}
          owner={owner}
          selected={owner.service === selected}
          onOpen={() => onOpen(owner)}
        />
      ))}
    </Section>
  );
}

export function SearchResults({ query, matches, onOpen }: ResultsProps) {
  const { t } = useTranslation();
  if (matches.length === 0)
    return (
      <Section>
        <Row
          title={t('screens.settings.hub.no-results', { query })}
          meta={t('screens.settings.hub.no-results-meta')}
        />
      </Section>
    );
  return (
    <Section title={t('screens.settings.hub.results')} meta={String(matches.length)}>
      {matches.slice(0, RESULTS_SHOWN).map(({ owner, setting }) => (
        <Row
          key={`${owner.service}:${setting.key}`}
          title={settingText(setting.key).label}
          meta={`${ownerName(owner)} · ${valueText(setting, setting.value)}`}
          chevron
          onPress={() => onOpen(owner)}
        />
      ))}
    </Section>
  );
}
