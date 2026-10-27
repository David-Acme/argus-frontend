import { usePathname } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { TranslateFn } from '@/core/types';
import { COMMAND_KEY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { BottomNavShown } from '@/shared/hooks/use-bottom-nav-inset';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useSurfaces, type ResolvedSurfaces } from '@/shared/libs/surfaces';
import { layout, useWindowLayout } from '@/shared/theme';
import {
  Nav,
  navCollapse,
  type ListenMode,
  type NavCopy,
  type NavItem,
  type NavVoice,
} from '@/shared/ui/nav';
import { AllSheet } from '@/features/navigation/components/all-sheet';
import { NavStatusBlock } from '@/features/navigation/components/nav-status-block';
import { useNavPins } from '@/features/navigation/hooks/use-nav-pins';
import { useSectionKeys } from '@/features/navigation/hooks/use-section-keys';
import { useSectionRoute } from '@/features/navigation/hooks/use-section-route';
import {
  activeChild,
  activeKey,
  ALL_KEY,
  barEntries,
  barKey,
  MENU_KEY,
  navGroups,
  railEntries,
  railFoot,
  type NavEntry,
  type NavGroups,
} from '@/features/navigation/model/nav-model';
import { barShownOn } from '@/features/navigation/model/nav-sections';
import { useAllSheetActions } from '@/features/navigation/stores/all-sheet.store';

export type AppNavigationProps = {
  voice: NavVoice;
  listening?: ListenMode;
  onCommand: () => void;
  children: ReactNode;
};

const CONTENT = { maxWidth: layout.contentMax };

const copyOf = (t: TranslateFn): NavCopy => ({
  navigation: t('screens.navigation.label'),
  argusHint: t('screens.navigation.argus-hint'),
  listening: t('screens.navigation.listening'),
  listeningTap: t('screens.navigation.listening-tap'),
  command: t('screens.navigation.command'),
  commandKey: COMMAND_KEY,
});

const flatten = (entries: readonly NavEntry[]): NavEntry[] =>
  entries.flatMap((entry) => [entry, ...flatten(entry.children ?? [])]);

type NavForm = {
  bar: boolean;
  sidebar: boolean;
  expanded: boolean;
  entries: NavEntry[];
  foot: NavEntry[];
  groups: NavGroups;
  setExpanded: (expanded: boolean) => void;
};

function useNavForm(pathname: string, resolved: ResolvedSurfaces): NavForm {
  const { navigation } = useWindowLayout();
  const pins = useNavPins();
  const [expandedAt, setExpandedAt] = useState<string | null>(null);
  const expanded = navigation === 'rail' && expandedAt === pathname;
  const sidebar = navigation === 'sidebar' || expanded;
  const bar = navigation === 'bar';
  const groups = navGroups(resolved, pins);
  const rail = !bar && !sidebar;
  return {
    bar,
    sidebar,
    expanded,
    groups,
    entries: bar
      ? barEntries(resolved, pins)
      : rail
        ? railEntries(resolved, pins)
        : [...groups.core],
    foot: bar ? [] : rail ? railFoot(resolved) : [...groups.account],
    setExpanded: (next) => setExpandedAt(next ? pathname : null),
  };
}

export function AppNavigation({ voice, listening, onCommand, children }: AppNavigationProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const go = useSectionRoute();
  const resolved = useSurfaces();
  const sheet = useAllSheetActions();
  const form = useNavForm(pathname, resolved);
  const { bar, sidebar, entries, foot, groups } = form;
  const unread = useViewCacheValue<number>(VIEW_CACHE_KEYS.dashboardUnread) ?? 0;
  const shown = !bar || barShownOn(pathname);
  const active = activeKey(pathname, resolved);
  const itemOf = (entry: NavEntry, index: number): NavItem => ({
    key: entry.key,
    label: t(entry.label),
    icon: entry.icon,
    argus: entry.argus,
    shortcut: sidebar && index >= 0 ? String(index + 1) : undefined,
    count: sidebar && entry.key === 'home' && unread > 0 ? String(unread) : undefined,
    children: entry.children?.map((child) => itemOf(child, -1)),
  });
  const known = flatten([...entries, ...foot, ...groups.modules]);
  const select = (key: string) => {
    if (key === MENU_KEY || (key === ALL_KEY && !bar)) form.setExpanded(true);
    else if (key === ALL_KEY) sheet.show();
    else {
      const entry = known.find((item) => item.key === key);
      if (entry?.argus) voice.onOpenChat();
      else if (entry) go(entry.href);
    }
  };
  useSectionKeys(sidebar, groups.core.length, (index) => select(groups.core[index]?.key ?? ''));

  useEffect(() => {
    navCollapse.set(0);
  }, [pathname]);

  const nav = (
    <Nav
      items={entries.map(itemOf)}
      active={bar ? barKey(active, entries) : active}
      onSelect={select}
      voice={voice}
      listening={listening}
      presence="idle"
      onCommand={onCommand}
      more={{
        foot: foot.map((entry) => itemOf(entry, -1)),
        modules: sidebar
          ? {
              label: t('screens.navigation.modules'),
              expandLabel: (module) => t('screens.navigation.expand-module', { module }),
              items: groups.modules.map((entry) => itemOf(entry, -1)),
              activeChild: activeChild(pathname, resolved),
            }
          : undefined,
        fold: form.expanded
          ? { label: t('screens.navigation.menu-close'), onCollapse: () => form.setExpanded(false) }
          : undefined,
      }}
      status={<NavStatusBlock onAsk={onCommand} />}
      copy={copyOf(t)}
    />
  );

  return (
    <BottomNavShown value={bar && shown}>
      <View className="bg-bg flex-1 flex-row">
        {bar ? null : nav}
        <View className="min-w-0 flex-1">
          <View className="w-full flex-1 self-center" style={CONTENT}>
            {children}
          </View>
        </View>
        {bar && shown ? nav : null}
      </View>
      {bar ? <AllSheet onSearch={onCommand} onArgus={voice.onOpenChat} /> : null}
    </BottomNavShown>
  );
}
