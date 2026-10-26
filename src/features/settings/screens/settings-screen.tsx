import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { SettingsOwner } from '@/core/types';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { resourceOf } from '@/shared/libs/remote-resource';
import { size, useWindowLayout } from '@/shared/theme';
import { Field } from '@/shared/ui/field';
import { Notice } from '@/shared/ui/notice';
import { ResourceView, SkeletonRow } from '@/shared/ui/resource-view';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { ModulesSwitchSection } from '@/features/modules';
import { DeviceSection } from '@/features/settings/components/device-section';
import { HowCard } from '@/features/settings/components/how-card';
import { ServiceDetail } from '@/features/settings/components/service-detail';
import { SearchResults, ServicesSection } from '@/features/settings/components/services-section';
import { useSettingsHub } from '@/features/settings/hooks/use-settings-hub';
import type { SettingsHub } from '@/features/settings/hooks/use-settings-hub';
import { matchingOwners, searchSettings } from '@/features/settings/model/services';
import { ownerName, settingText } from '@/features/settings/model/setting-text';

type HubProps = {
  hub: SettingsHub;
  selected: SettingsOwner | null;
  onOpen: (owner: SettingsOwner) => void;
};

type PaneProps = { hub: SettingsHub; owner: SettingsOwner | null };

const SEARCH = { describe: settingText, ownerName };

function Hub({ hub, selected, onOpen }: HubProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const copy = useResourceCopy({ title: t('screens.settings.load-error') });
  const searching = query.trim() !== '';
  const resource = resourceOf({
    data: hub.owners.length > 0 ? hub.owners : null,
    status: hub.settings.failed ? 'failed' : 'loading',
    retry: hub.settings.reload,
  });
  return (
    <>
      <Section variant="plain">
        <Field
          placeholder={t('screens.settings.hub.search')}
          value={query}
          onChangeText={setQuery}
        />
      </Section>
      {searching ? (
        <SearchResults
          query={query}
          matches={searchSettings(hub.owners, query, SEARCH)}
          onOpen={onOpen}
        />
      ) : (
        <HowCard profiles={hub.profiles} />
      )}
      <ResourceView
        resource={resource}
        copy={copy}
        skeleton={
          <Section>
            <SkeletonRow trailing />
            <SkeletonRow trailing />
            <SkeletonRow trailing />
          </Section>
        }
        empty={{
          message: t('screens.settings.load-error'),
          action: { label: t('common.retry'), onPress: hub.settings.reload },
        }}>
        {(owners) => (
          <ServicesSection
            owners={matchingOwners(owners, query, SEARCH)}
            selected={selected?.service ?? null}
            onOpen={onOpen}
          />
        )}
      </ResourceView>
      {searching ? null : <ModulesSwitchSection />}
      {searching ? null : <DeviceSection />}
    </>
  );
}

function Pane({ hub, owner }: PaneProps) {
  const { t } = useTranslation();
  if (!owner)
    return (
      <Section variant="plain">
        <Notice
          icon="sliders"
          title={t('screens.settings.services.pick')}
          body={t('screens.settings.services.pick-meta')}
        />
      </Section>
    );
  return <ServiceDetail owner={owner} onChange={hub.change} onRetry={hub.settings.reload} />;
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { windowClass, navigation } = useWindowLayout();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const hub = useSettingsHub();
  const [chosen, setChosen] = useState<string | null>(null);
  const split = windowClass !== 'compact';
  const wanted = chosen ?? service ?? null;
  const owner =
    hub.owners.find((candidate) => candidate.service === wanted) ??
    (split ? (hub.owners[0] ?? null) : null);
  const open = (target: SettingsOwner) => {
    if (split) setChosen(target.service);
    else router.push({ pathname: '/settings/[service]', params: { service: target.service } });
  };
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(owner && !split ? '/settings' : '/profile');
  };

  if (!split && owner)
    return (
      <Screen back={{ label: t('screens.settings.services.back'), onPress: back }}>
        <Pane hub={hub} owner={owner} />
      </Screen>
    );

  return (
    <Screen
      columns="panes"
      title={t('screens.settings.title')}
      back={navigation === 'bar' ? { label: t('common.back'), onPress: back } : undefined}>
      <ScreenColumns>
        <ScreenColumn
          label={t('screens.settings.title')}
          width={windowClass === 'medium' ? size.columnWide : size.columnProfile}
          grows={0}>
          <Hub hub={hub} selected={owner} onOpen={open} />
        </ScreenColumn>
        {split ? (
          <ScreenColumn
            label={owner ? ownerName(owner) : t('screens.settings.services.pick')}
            grows={0}>
            <Pane hub={hub} owner={owner} />
          </ScreenColumn>
        ) : null}
      </ScreenColumns>
    </Screen>
  );
}
