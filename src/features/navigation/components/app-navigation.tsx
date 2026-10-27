import { usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { NavStatusBlock } from '@/features/navigation/components/nav-status-block';
import { useSectionKeys } from '@/features/navigation/hooks/use-section-keys';
import { useSectionRoute } from '@/features/navigation/hooks/use-section-route';
import {
  barShownOn,
  sectionOf,
  settingsVisible,
  SETTINGS_TAB,
  visibleTabs,
  type NavTab,
} from '@/features/navigation/model/nav-sections';
import { COMMAND_KEY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { BottomNavShown } from '@/shared/hooks/use-bottom-nav-inset';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { layout, useWindowLayout } from '@/shared/theme';
import { Nav, navCollapse, type ListenMode, type NavItem, type NavVoice } from '@/shared/ui/nav';

export type AppNavigationProps = {
  voice: NavVoice;
  listening?: ListenMode;
  onCommand: () => void;
  children: ReactNode;
};

const CONTENT = { maxWidth: layout.contentMax };

export function AppNavigation({ voice, listening, onCommand, children }: AppNavigationProps) {
  const pathname = usePathname();
  const view = useAccessView();
  const { t } = useTranslation();
  const { navigation } = useWindowLayout();
  const go = useSectionRoute();
  const unread = useViewCacheValue<number>(VIEW_CACHE_KEYS.dashboardUnread) ?? 0;
  const sidebar = navigation === 'sidebar';
  const bar = navigation === 'bar';
  const tabs = visibleTabs(view);
  const settings = sidebar && settingsVisible(view) ? SETTINGS_TAB : undefined;
  const shown = !bar || barShownOn(pathname);
  const itemOf = (tab: NavTab, index: number): NavItem => ({
    key: tab.key,
    label: t(tab.label),
    icon: tab.icon,
    argus: tab.argus,
    shortcut: sidebar && index >= 0 ? String(index + 1) : undefined,
    count: sidebar && tab.key === 'home' && unread > 0 ? String(unread) : undefined,
  });
  const open = (tab: NavTab | undefined) => {
    if (tab?.argus) voice.onOpenChat();
    else if (tab) go(tab.href);
  };
  const select = (key: string) => open([...tabs, SETTINGS_TAB].find((tab) => tab.key === key));
  useSectionKeys(sidebar, tabs.length, (index) => open(tabs[index]));

  useEffect(() => {
    navCollapse.set(0);
  }, [pathname]);

  const nav = (
    <Nav
      items={tabs.map(itemOf)}
      active={sectionOf(pathname, settings !== undefined)}
      onSelect={select}
      voice={voice}
      listening={listening}
      presence="idle"
      onCommand={onCommand}
      settings={settings ? itemOf(settings, -1) : undefined}
      status={<NavStatusBlock onAsk={onCommand} />}
      copy={{
        navigation: t('screens.navigation.label'),
        argusHint: t('screens.navigation.argus-hint'),
        listening: t('screens.navigation.listening'),
        listeningTap: t('screens.navigation.listening-tap'),
        command: t('screens.navigation.command'),
        commandKey: COMMAND_KEY,
      }}
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
    </BottomNavShown>
  );
}
