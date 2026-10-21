import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Pressable, TextInput, View, type NativeSyntheticEvent } from 'react-native';
import { useThemeTokens } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import type { CommandItem } from './command-types';
import type { CommandState } from './use-command';

export type CommandPanelProps = {
  state: CommandState;
  askMark?: ReactNode;
  hints?: boolean;
};

type KeyProps = { label: string };

type OptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
};

type ItemOptionProps = {
  item: CommandItem;
  index: number;
  state: CommandState;
};

type KeyEvent = NativeSyntheticEvent<{ key: string }> & { preventDefault?: () => void };

export function Key({ label }: KeyProps) {
  return (
    <View className="border-line rounded-key px-key-x border border-b-2">
      <Text variant="key" tone="2">
        {label}
      </Text>
    </View>
  );
}

function Option({ label, selected, onPress, children }: OptionProps) {
  return (
    <Pressable
      role="option"
      aria-label={label}
      aria-selected={selected}
      onPress={onPress}
      className={clsx(
        'min-h-target-min px-palette-item-x gap-palette-gap rounded-control flex-row items-center',
        selected ? 'bg-fill' : 'web:hover:bg-fill'
      )}>
      {children}
    </Pressable>
  );
}

function GroupTitle({ title }: { title: string }) {
  return (
    <View className="px-palette-text-title-x pt-palette-text-title-top pb-palette-text-title-bottom">
      <Text variant="groupTitle" tone="3">
        {title.toLocaleUpperCase()}
      </Text>
    </View>
  );
}

function ItemOption({ item, index, state }: ItemOptionProps) {
  return (
    <Option label={item.label} selected={state.selected === index} onPress={() => state.run(index)}>
      <Icon name={item.icon} size="small" />
      <View className="shrink">
        <Text variant="feed" numberOfLines={1}>
          {item.label}
        </Text>
      </View>
      {item.meta ? <Text variant="meta">{`· ${item.meta}`}</Text> : null}
      <View className="flex-1" />
      {item.shortcut ? <Key label={item.shortcut} /> : null}
    </Option>
  );
}

function AskGroup({ state, askMark }: Pick<CommandPanelProps, 'state' | 'askMark'>) {
  const { t } = useTranslation();
  if (!state.asks) return null;
  const label = t('common.overlay.command-ask', { query: state.query.trim() });
  const title = t('common.overlay.command-ask-group');
  return (
    <View role="group" aria-label={title}>
      <GroupTitle title={title} />
      <Option label={label} selected={state.selected === 0} onPress={() => state.run(0)}>
        {askMark ?? <Icon name="search" size="small" tone="accent" />}
        <View className="min-w-0 flex-1">
          <Text variant="feed" numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Key label={t('common.overlay.key-enter')} />
      </Option>
    </View>
  );
}

function firstIndexes(state: CommandState): number[] {
  const offset = state.asks ? 1 : 0;
  return state.groups.map((_, at) =>
    state.groups.slice(0, at).reduce((sum, group) => sum + group.items.length, offset)
  );
}

function Results({ state, askMark }: Pick<CommandPanelProps, 'state' | 'askMark'>) {
  const firsts = firstIndexes(state);
  return (
    <View className="p-palette-group">
      <AskGroup state={state} askMark={askMark} />
      {state.groups.map((group, at) => (
        <View key={group.title} role="group" aria-label={group.title}>
          <GroupTitle title={group.title} />
          {group.items.map((item, position) => (
            <ItemOption
              key={item.id}
              item={item}
              index={(firsts[at] ?? 0) + position}
              state={state}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function QueryRow({ state, hints }: Pick<CommandPanelProps, 'state' | 'hints'>) {
  const { t } = useTranslation();
  const { color } = useThemeTokens();
  const onKeyPress = (event: KeyEvent) => {
    if (state.onKey(event.nativeEvent.key)) event.preventDefault?.();
  };
  return (
    <View className="px-palette-query-x py-palette-query-y gap-palette-gap border-line flex-row items-center border-b">
      <Icon name="search" />
      <TextInput
        value={state.query}
        onChangeText={state.setQuery}
        onKeyPress={onKeyPress}
        onSubmitEditing={state.submit}
        aria-label={t('common.overlay.command-label')}
        placeholder={t('common.overlay.command-label')}
        placeholderTextColor={color['text-3']}
        cursorColor={color.accent}
        selectionColor={color.accent}
        className="text-query text-text web:font-system web:outline-none min-w-0 flex-1 p-0"
      />
      {hints ? <Key label={t('common.overlay.key-escape')} /> : null}
    </View>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <View className="px-palette-text-foot-x py-palette-text-foot-y gap-palette-text-foot-gap border-line flex-row border-t">
      <Text variant="hint" tone="3">
        {t('common.overlay.command-move')}
      </Text>
      <Text variant="hint" tone="3">
        {t('common.overlay.command-open')}
      </Text>
      <Text variant="hint" tone="3">
        {t('common.overlay.command-close')}
      </Text>
    </View>
  );
}

export function CommandPanel({ state, askMark, hints }: CommandPanelProps) {
  return (
    <>
      <QueryRow state={state} hints={hints} />
      <Results state={state} askMark={askMark} />
      {hints ? <Footer /> : null}
    </>
  );
}
