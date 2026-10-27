import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useSurfaces } from '@/shared/libs/surfaces';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import type { MenuItems } from '@/shared/ui/menu';
import { PressableSurface } from '@/shared/ui/pressable';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Sheet } from '@/shared/ui/sheet';
import { Text } from '@/shared/ui/text';
import { ModuleTile } from '@/features/navigation/components/module-tile';
import { useNavPins } from '@/features/navigation/hooks/use-nav-pins';
import {
  moduleEntry,
  navGroups,
  SHEET_GRID,
  type NavEntry,
} from '@/features/navigation/model/nav-model';
import {
  useAllSheetActions,
  useAllSheetFull,
  useAllSheetOpen,
} from '@/features/navigation/stores/all-sheet.store';

export type AllSheetProps = { onSearch: () => void; onArgus: () => void };

const GRID_COLUMNS = 4;

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  );
}

type SearchRowProps = { onPress: () => void };

function SearchRow({ onPress }: SearchRowProps) {
  const { t } = useTranslation();
  return (
    <PressableSurface
      a11y={{ label: t('screens.navigation.search'), role: 'button' }}
      onPress={onPress}
      className="min-h-command-field px-nav-item-x rounded-control bg-fill flex-row items-center gap-2">
      <Icon name="search" size="small" tone="text-3" />
      <Text variant="meta" tone="3" numberOfLines={1}>
        {t('screens.navigation.search')}
      </Text>
    </PressableSurface>
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
        <Button
          block
          variant="ghost"
          label={t('screens.navigation.see-modules', { count: String(modules.length) })}
          onPress={onExpand}
        />
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

export function AllSheet({ onSearch, onArgus }: AllSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const open = useAllSheetOpen();
  const full = useAllSheetFull();
  const { close, expand } = useAllSheetActions();
  const resolved = useSurfaces();
  const pins = useNavPins();
  const actionsOf = usePinActions();
  const groups = navGroups(resolved, pins);
  const modules = resolved.modules.map(moduleEntry);
  const general = [...groups.core.filter((entry) => entry.key === 'news'), ...groups.account];
  const go = (entry: NavEntry) => {
    close();
    if (entry.argus) onArgus();
    else router.navigate(entry.href);
  };
  const search = () => {
    close();
    onSearch();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('screens.navigation.all')}
      variant="list"
      long={full}>
      <View className="gap-4">
        <SearchRow onPress={search} />
        {modules.length > 0 && !full ? (
          <ModuleGrid modules={modules} actionsOf={actionsOf} onOpen={go} onExpand={expand} />
        ) : null}
        {modules.length > 0 && full ? <ModuleList modules={modules} onOpen={go} /> : null}
        <GeneralList entries={general} onOpen={go} />
      </View>
    </Sheet>
  );
}
