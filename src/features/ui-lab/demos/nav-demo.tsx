import { View } from 'react-native';
import { layout, size } from '@/shared/theme';
import { Nav, NavStatus, type NavItem, type NavProps } from '@/shared/ui/nav';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

const FRAME = { height: size.previewPhone };

const SIDE = { width: layout.sidebar };

const ITEMS: readonly NavItem[] = [
  { key: 'home', label: copy.tabHome, icon: 'home', shortcut: '1' },
  { key: 'security', label: copy.tabSecurity, icon: 'shield', shortcut: '2' },
  { key: 'argus', label: copy.tabArgus, icon: 'cmd', shortcut: '3', argus: true },
  { key: 'agenda', label: copy.tabAgenda, icon: 'cal', shortcut: '4' },
  { key: 'you', label: copy.tabYou, icon: 'user', shortcut: '5' },
];

const NAV: NavProps = {
  items: ITEMS,
  active: 'home',
  onSelect: noop,
  voice: { onOpenChat: noop, onListenStart: noop, onListenEnd: noop },
  copy: {
    navigation: 'Principal',
    argusHint: copy.argusTab,
    listening: copy.listening,
    listeningTap: copy.listeningTap,
    command: copy.commandHint,
    commandKey: '⌘K',
  },
  presence: 'idle',
  onCommand: noop,
  more: { foot: [{ key: 'settings', label: copy.settings, icon: 'sliders' }] },
};

const status = (
  <NavStatus
    title={copy.serverName}
    rows={[
      { icon: 'home', before: copy.modeLine, strong: copy.modeHome },
      { icon: 'cam', strong: copy.camerasCount, after: copy.camerasActive },
    ]}
    meter={{ label: copy.storage, value: copy.storageValue, fraction: 0.62 }}
    ask={{ label: copy.askArgusPrompt, onPress: noop }}
    presence="idle"
  />
);

export function NavDemo() {
  return (
    <>
      <LabCase id="nav" block>
        <View className="bg-bg relative flex-row overflow-hidden" style={FRAME}>
          <Nav {...NAV} status={status} />
        </View>
      </LabCase>
      <LabCase id="listening" block>
        <View className="bg-bg relative flex-row overflow-hidden" style={FRAME}>
          <Nav {...NAV} status={status} listening="hold" />
        </View>
      </LabCase>
      <LabCase id="status">
        <View style={SIDE}>{status}</View>
      </LabCase>
    </>
  );
}
