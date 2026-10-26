import { clsx } from 'clsx';
import type { ReactNode, RefObject } from 'react';
import { Pressable, ScrollView, TextInput, View, type NativeSyntheticEvent } from 'react-native';
import { size, useThemeTokens } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Icon } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import type { CommandItem } from './command-types';
import { Listbox, optionId } from './listbox';
import type { CommandState } from './use-command';

export type CommandPanelProps = {
  state: CommandState;
  hints?: boolean;
  inputRef?: RefObject<TextInput | null>;
};

type KeyProps = { label: string };

type OptionProps = {
  id: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
};

type ItemOptionProps = {
  item: CommandItem;
  index: number;
  state: CommandState;
  hints?: boolean;
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

function Option({ id, label, selected, onPress, children }: OptionProps) {
  return (
    <Pressable
      nativeID={id}
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

function ItemOption({ item, index, state, hints }: ItemOptionProps) {
  return (
    <Option
      id={optionId(state.listId, index)}
      label={item.label}
      selected={state.selected === index}
      onPress={() => state.run(index)}>
      <Icon name={item.icon} size="small" />
      <View className="shrink">
        <Text variant="feed" numberOfLines={1}>
          {item.label}
        </Text>
      </View>
      {item.meta ? <Text variant="meta">{`· ${item.meta}`}</Text> : null}
      <View className="flex-1" />
      {hints && item.shortcut ? <Key label={item.shortcut} /> : null}
    </Option>
  );
}

function AskGroup({ state, hints }: Pick<CommandPanelProps, 'state' | 'hints'>) {
  const { t } = useTranslation();
  if (!state.asks) return null;
  const label = t('common.overlay.command-ask', { query: state.query.trim() });
  const title = t('common.overlay.command-ask-group');
  return (
    <View role="group" aria-label={title}>
      <GroupTitle title={title} />
      <Option
        id={optionId(state.listId, 0)}
        label={label}
        selected={state.selected === 0}
        onPress={() => state.run(0)}>
        <Presence state="think" size={size.presenceThink} />
        <View className="min-w-0 flex-1">
          <Text variant="feed" numberOfLines={1}>
            {label}
          </Text>
        </View>
        {hints ? <Key label={t('common.overlay.key-enter')} /> : null}
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

function Results({ state, hints }: Pick<CommandPanelProps, 'state' | 'hints'>) {
  const firsts = firstIndexes(state);
  return (
    <Listbox id={state.listId}>
      <AskGroup state={state} hints={hints} />
      {state.groups.map((group, at) => (
        <View key={group.title} role="group" aria-label={group.title}>
          <GroupTitle title={group.title} />
          {group.items.map((item, position) => (
            <ItemOption
              key={item.id}
              item={item}
              index={(firsts[at] ?? 0) + position}
              state={state}
              hints={hints}
            />
          ))}
        </View>
      ))}
    </Listbox>
  );
}

function QueryRow({
  state,
  hints,
  inputRef,
}: Pick<CommandPanelProps, 'state' | 'hints' | 'inputRef'>) {
  const { t } = useTranslation();
  const { color } = useThemeTokens();
  const onKeyPress = (event: KeyEvent) => {
    if (state.onKey(event.nativeEvent.key)) event.preventDefault?.();
  };
  const combobox = {
    'aria-controls': state.listId,
    'aria-activedescendant': optionId(state.listId, state.selected),
  };
  return (
    <View className="px-palette-query-x py-palette-query-y gap-palette-gap border-line flex-row items-center border-b">
      <Icon name="search" />
      <TextInput
        ref={inputRef}
        role="combobox"
        aria-expanded
        {...combobox}
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

export function CommandPanel({ state, hints, inputRef }: CommandPanelProps) {
  return (
    <>
      <QueryRow state={state} hints={hints} inputRef={inputRef} />
      {hints ? (
        <ScrollView className="shrink" keyboardShouldPersistTaps="handled">
          <Results state={state} hints />
        </ScrollView>
      ) : (
        <Results state={state} />
      )}
      {hints ? <Footer /> : null}
    </>
  );
}
