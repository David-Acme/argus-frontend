import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { matchesWords, searchWords } from '@/shared/libs/text-search';
import { useSurfaces } from '@/shared/libs/surfaces';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import type { MenuItems } from '@/shared/ui/menu';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Sheet } from '@/shared/ui/sheet';
import { useCommandSearch } from '@/features/command';
import { ModuleTile } from '@/features/navigation/components/module-tile';
import { useNavPins } from '@/features/navigation/hooks/use-nav-pins';
import {
  allSheetLong,
  moduleEntry,
  moreModulesThanGrid,
  navGroups,
  SHEET_GRID,
  type NavEntry,
} from '@/features/navigation/model/nav-model';
import {
  useAllSheetActions,
  useAllSheetFull,
  useAllSheetOpen,
} from '@/features/navigation/stores/all-sheet.store';

export type AllSheetProps = { onArgus: () => void };

const GRID_COLUMNS = 4;

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  );
}

type SearchResultsProps = {
  query: string;
  destinations: readonly NavEntry[];
  onOpen: (entry: NavEntry) => void;
  onRun: (run: () => void) => void;
};

const MINUTE_MS = 60_000;

function SearchResults({ query, destinations, onOpen, onRun }: SearchResultsProps) {
  const { t } = useTranslation();
  const openedAt = useNow(MINUTE_MS);
  const search = useCommandSearch({ query, scope: 'all', openedAt, enabled: true });
  const words = searchWords(query);
  const places = destinations.filter((entry) => matchesWords(t(entry.label), words));
  const found = places.length > 0 || search.results.length > 0;
  return (
    <View className="flex-1 gap-4">
      {places.length > 0 ? (
        <Section title={t('screens.navigation.search-dest')}>
          {places.map((entry) => (
            <Row
              key={entry.key}
              leading={<Avatar icon={entry.icon} size="small" />}
              title={t(entry.label)}
              chevron
              onPress={() => onOpen(entry)}
            />
          ))}
        </Section>
      ) : null}
      {search.results.map((group) => (
        <Section key={group.title} title={group.title}>
          {group.items.map((item) => (
            <Row
              key={item.id}
              leading={<Avatar icon={item.icon} size="small" />}
              title={item.label}
              meta={item.meta}
              onPress={() => onRun(item.onRun)}
            />
          ))}
        </Section>
      ))}
      {search.results.length > 0 && search.paging.footer === 'loading' ? (
        <Button
          block
          variant="ghost"
          label={t('screens.navigation.search-more')}
          busy={search.paging.loading}
          onPress={search.paging.onEndReached}
        />
      ) : null}
      {!found && !search.pending ? (
        <View className="flex-1 justify-center">
          <Notice centred icon="search" title={t('screens.navigation.search-none', { query })} />
        </View>
      ) : null}
    </View>
  );
}

type ModulesProps = {
  modules: readonly NavEntry[];
  actionsOf: (entry: NavEntry) => MenuItems;
  onOpen: (entry: NavEntry) => void;
  onExpand: () => void;
};

function ModuleGrid({ modules, actionsOf, onOpen, onExpand }: ModulesProps) {
  const { t } = useTranslation();
  return (
    <Section title={t('screens.navigation.modules')} variant="plain">
      <View className="gap-3">
        {chunk(modules.slice(0, SHEET_GRID), GRID_COLUMNS).map((row, index) => (
          <View key={row[0]?.key ?? index} className="flex-row gap-2">
            {row.map((entry) => (
              <ModuleTile
                key={entry.key}
                entry={entry}
                actions={actionsOf(entry)}
                onOpen={onOpen}
              />
            ))}
            {Array.from({ length: GRID_COLUMNS - row.length }, (_, slot) => (
              <View key={`slot-${slot}`} className="flex-1" />
            ))}
          </View>
        ))}
        {moreModulesThanGrid(modules.length) ? (
          <Button
            block
            variant="ghost"
            label={t('screens.navigation.see-modules', { count: String(modules.length) })}
            onPress={onExpand}
          />
        ) : null}
      </View>
    </Section>
  );
}

function ModuleList({ modules, onOpen }: Pick<ModulesProps, 'modules' | 'onOpen'>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <Section title={t('screens.navigation.modules')}>
      {modules.flatMap((entry) => {
        const shown = expanded === entry.key;
        const label = t(entry.label);
        const head = (
          <Row
            key={entry.key}
            leading={<Avatar icon={entry.icon} tone="accent" />}
            title={label}
            trailing={
              <Button
                iconOnly
                compact
                variant="ghost"
                icon={shown ? 'chevu' : 'chevd'}
                label={t('screens.navigation.expand-module', { module: label })}
                onPress={() => setExpanded(shown ? null : entry.key)}
              />
            }
            onPress={() => onOpen(entry)}
          />
        );
        if (!shown) return [head];
        return [
          head,
          ...(entry.children ?? []).map((child) => (
            <Row
              key={`${entry.key}-${child.key}`}
              leading={<Avatar icon={child.icon} size="small" />}
              title={t(child.label)}
              chevron
              onPress={() => onOpen(child)}
            />
          )),
        ];
      })}
    </Section>
  );
}

type GeneralProps = { entries: readonly NavEntry[]; onOpen: (entry: NavEntry) => void };

function GeneralList({ entries, onOpen }: GeneralProps) {
  const { t } = useTranslation();
  return (
    <Section title={t('screens.navigation.general')}>
      {entries.map((entry) => (
        <Row
          key={entry.key}
          leading={<Avatar icon={entry.icon} size="small" />}
          title={t(entry.label)}
          chevron
          onPress={() => onOpen(entry)}
        />
      ))}
    </Section>
  );
}

function usePinActions(): (entry: NavEntry) => MenuItems {
  const { t } = useTranslation();
  const pins = useNavPins();
  return (entry) => {
    const module = entry.key.slice(entry.key.indexOf(':') + 1);
    return [
      {
        label: pins.bar.includes(module)
          ? t('screens.navigation.unpin')
          : t('screens.navigation.pin'),
        icon: 'pin',
        onPress: () => pins.toggleBar(module),
      },
      {
        label: pins.quick.includes(module)
          ? t('screens.navigation.quick-remove')
          : t('screens.navigation.quick-add'),
        icon: 'plus',
        onPress: () => pins.toggleQuick(module),
      },
    ];
  };
}

const flatten = (entries: readonly NavEntry[]): NavEntry[] =>
  entries.flatMap((entry) => [entry, ...flatten(entry.children ?? [])]);

export function AllSheet({ onArgus }: AllSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const open = useAllSheetOpen();
  const full = useAllSheetFull();
  const { close, expand } = useAllSheetActions();
  const resolved = useSurfaces();
  const pins = useNavPins();
  const actionsOf = usePinActions();
  const [query, setQuery] = useState('');
  const groups = navGroups(resolved, pins);
  const modules = resolved.modules.map(moduleEntry);
  const general = [...groups.core.filter((entry) => entry.key === 'news'), ...groups.account];
  const searching = query.trim().length > 0;
  const shut = () => {
    setQuery('');
    close();
  };
  const go = (entry: NavEntry) => {
    shut();
    if (entry.argus) onArgus();
    else router.navigate(entry.href);
  };
  const run = (action: () => void) => {
    shut();
    action();
  };
  return (
    <Sheet
      open={open}
      onClose={shut}
      title={t('screens.navigation.all')}
      variant="list"
      long={allSheetLong({ searching, full })}>
      <View className={searching ? 'flex-1 gap-4' : 'gap-4'}>
        <Field placeholder={t('screens.navigation.search')} value={query} onChangeText={setQuery} />
        {searching ? (
          <SearchResults
            query={query}
            destinations={flatten([...groups.core, ...modules, ...groups.account])}
            onOpen={go}
            onRun={run}
          />
        ) : (
          <>
            {modules.length > 0 && !full ? (
              <ModuleGrid modules={modules} actionsOf={actionsOf} onOpen={go} onExpand={expand} />
            ) : null}
            {modules.length > 0 && full ? <ModuleList modules={modules} onOpen={go} /> : null}
            <GeneralList entries={general} onOpen={go} />
          </>
        )}
      </View>
    </Sheet>
  );
}
