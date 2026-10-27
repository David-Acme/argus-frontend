import { clsx } from 'clsx';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { layout, size } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { KeyHint } from './key-hint';
import type { NavItem, NavModules, NavProps } from './nav-types';

type SideItemProps = Pick<NavProps, 'onSelect' | 'voice'> & {
  item: NavItem;
  selected: boolean;
};

type CommandProps = { label: string; shortcut: string; onPress: () => void };

type ModuleGroupProps = Pick<NavProps, 'onSelect' | 'voice' | 'active'> & {
  modules: NavModules;
  activeChild?: string | null;
};

const SIDE = { width: layout.sidebar };

const SLOP = (size.target - size.navItem) / 2;

const SHRINK = { flexGrow: 0, flexShrink: 1 };

function Trailing({ item, selected }: Pick<SideItemProps, 'item' | 'selected'>) {
  if (item.count)
    return (
      <View className="bg-accent-soft px-nav-count-x py-nav-count-y ml-auto rounded-full">
        <Text variant="count" tone="accent">
          {item.count}
        </Text>
      </View>
    );
  if (!item.shortcut) return null;
  return (
    <View className="ml-auto">
      <KeyHint label={item.shortcut} reveal={!selected} />
    </View>
  );
}

function ModuleGroup({ modules, active, activeChild, onSelect, voice }: ModuleGroupProps) {
  const [open, setOpen] = useState<string | null>(active);
  return (
    <View className="gap-nav-side-gap">
      <View className="px-nav-item-x pt-3">
        <Text variant="groupTitle" tone="3">
          {modules.label}
        </Text>
      </View>
      {modules.items.map((item) => {
        const shown = open === item.key;
        return (
          <View key={item.key} className="gap-nav-side-gap">
            <View className="flex-row items-center">
              <View className="min-w-0 flex-1">
                <SideItem
                  item={item}
                  selected={active === item.key}
                  onSelect={onSelect}
                  voice={voice}
                />
              </View>
              {item.children && item.children.length > 0 ? (
                <PressableSurface
                  a11y={{ label: modules.expandLabel(item.label), role: 'button', expanded: shown }}
                  onPress={() => setOpen(shown ? null : item.key)}
                  hitSlop={SLOP}
                  className="min-h-nav-item rounded-control web:hover:bg-fill items-center justify-center px-2">
                  <Icon name={shown ? 'chevu' : 'chevd'} size="small" tone="text-3" />
                </PressableSurface>
              ) : null}
            </View>
            {shown
              ? (item.children ?? []).map((child) => (
                  <View key={child.key} className="pl-6">
                    <SideItem
                      item={child}
                      selected={activeChild === child.key}
                      onSelect={onSelect}
                      voice={voice}
                    />
                  </View>
                ))
              : null}
          </View>
        );
      })}
    </View>
  );
}

function SideItem({ item, selected, onSelect, voice }: SideItemProps) {
  return (
    <PressableSurface
      a11y={{ label: item.label, role: 'tab', selected }}
      onPress={() => (item.argus ? voice.onOpenChat() : onSelect(item.key))}
      hitSlop={SLOP}
      className={clsx(
        'min-h-nav-item px-nav-item-x rounded-control group w-full flex-row items-center gap-3',
        selected ? 'bg-fill' : 'web:hover:bg-fill'
      )}>
      <Icon name={item.icon} size="small" tone={selected ? 'text' : 'text-2'} />
      <Text variant="label" tone={selected ? 'default' : '2'} numberOfLines={1}>
        {item.label}
      </Text>
      <Trailing item={item} selected={selected} />
    </PressableSurface>
  );
}

function Command({ label, shortcut, onPress }: CommandProps) {
  return (
    <PressableSurface
      a11y={{ label, role: 'button' }}
      onPress={onPress}
      hitSlop={(size.target - size.commandField) / 2}
      className="min-h-command-field px-nav-item-x rounded-control bg-fill mb-3 w-full flex-row items-center gap-2">
      <Icon name="search" size="small" tone="text-3" />
      <Text variant="meta" tone="3" numberOfLines={1}>
        {label}
      </Text>
      <View className="ml-auto">
        <KeyHint label={shortcut} />
      </View>
    </PressableSurface>
  );
}

export function NavSidebar(props: NavProps) {
  const { items, active, onSelect, voice, copy, presence, onCommand, status, more } = props;
  const modules = more?.modules;
  const fold = more?.fold;
  const brand = items.find((item) => item.argus);
  return (
    <View
      role="tablist"
      aria-label={copy.navigation}
      className="border-line px-nav-side-x py-nav-side-y gap-nav-side-gap bg-surface h-full border-r"
      style={SIDE}>
      <View className="px-nav-brand-x pb-nav-brand-bottom gap-nav-brand-gap flex-row items-center">
        {presence ? <Presence state={presence} size={size.presenceBrand} paused /> : null}
        <Text variant="brand">{brand?.label ?? copy.navigation}</Text>
        {fold ? (
          <View className="ml-auto">
            <PressableSurface
              a11y={{ label: fold.label, role: 'button' }}
              onPress={fold.onCollapse}
              hitSlop={SLOP}
              className="min-h-nav-item rounded-control web:hover:bg-fill items-center justify-center px-2">
              <Icon name="chevl" size="small" tone="text-2" />
            </PressableSurface>
          </View>
        ) : null}
      </View>
      {onCommand ? (
        <Command label={copy.command} shortcut={copy.commandKey} onPress={onCommand} />
      ) : null}
      {items.map((item) => (
        <SideItem
          key={item.key}
          item={item}
          selected={active === item.key}
          onSelect={onSelect}
          voice={voice}
        />
      ))}
      {modules && modules.items.length > 0 ? (
        <ScrollView style={SHRINK} showsVerticalScrollIndicator={false}>
          <ModuleGroup
            modules={modules}
            active={active}
            activeChild={modules.activeChild}
            onSelect={onSelect}
            voice={voice}
          />
        </ScrollView>
      ) : null}
      <View className="flex-1" />
      {status}
      {(more?.foot ?? []).map((item) => (
        <SideItem
          key={item.key}
          item={item}
          selected={active === item.key}
          onSelect={onSelect}
          voice={voice}
        />
      ))}
    </View>
  );
}
