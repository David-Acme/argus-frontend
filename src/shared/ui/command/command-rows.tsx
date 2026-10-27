import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { size } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Icon, type IconGlyph, type IconTone } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import type { CommandInk, CommandItem } from './command-types';
import { optionId } from './listbox';
import type { CommandState } from './use-command';

type KeyProps = { label: string };

type OptionProps = {
  id: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
};

type WellProps = { icon: IconGlyph; ink: CommandInk };

type GroupTitleProps = { title: string };

export type ItemOptionProps = {
  item: CommandItem;
  index: number;
  state: CommandState;
  hints?: boolean;
};

export type AskOptionProps = { state: CommandState; hints?: boolean };

type Ink = { well: string; icon: IconTone };

const INK: Record<CommandInk, Ink> = {
  neutral: { well: 'bg-fill', icon: 'text-2' },
  accent: { well: 'bg-accent-soft', icon: 'accent' },
  ok: { well: 'bg-ok-soft', icon: 'ok' },
  agenda: { well: 'bg-ev3', icon: 'ev3-text' },
  project: { well: 'bg-ev2', icon: 'ev2-text' },
  person: { well: 'bg-ev1', icon: 'ev1-text' },
};

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
        'min-h-row px-palette-item-x gap-row-gap rounded-control flex-row items-center',
        selected ? 'bg-fill' : 'web:hover:bg-fill'
      )}>
      {children}
    </Pressable>
  );
}

function Well({ icon, ink }: WellProps) {
  const tone = INK[ink];
  return (
    <View
      className={clsx('size-well-small rounded-seg-inner items-center justify-center', tone.well)}>
      <Icon name={icon} size="small" tone={tone.icon} />
    </View>
  );
}

export function GroupTitle({ title }: GroupTitleProps) {
  return (
    <View
      testID="command-group"
      className="px-palette-text-title-x pt-palette-text-title-top pb-palette-text-title-bottom">
      <Text variant="groupTitle" tone="3">
        {title.toLocaleUpperCase()}
      </Text>
    </View>
  );
}

export function ItemOption({ item, index, state, hints }: ItemOptionProps) {
  return (
    <Option
      id={optionId(state.listId, index)}
      label={item.label}
      selected={state.selected === index}
      onPress={() => state.run(index)}>
      <Well icon={item.icon} ink={item.ink ?? 'neutral'} />
      <View className="gap-row-meta-gap min-w-0 flex-1">
        <Text variant="rowTitle" numberOfLines={1}>
          {item.label}
        </Text>
        {item.meta ? (
          <Text variant="rowMeta" tone="3" numberOfLines={1}>
            {item.meta}
          </Text>
        ) : null}
      </View>
      {hints && item.shortcut ? <Key label={item.shortcut} /> : null}
    </Option>
  );
}

export function AskOption({ state, hints }: AskOptionProps) {
  const { t } = useTranslation();
  const label = t('common.overlay.command-ask', { query: state.query.trim() });
  return (
    <Option
      id={optionId(state.listId, 0)}
      label={label}
      selected={state.selected === 0}
      onPress={() => state.run(0)}>
      <View className="size-well-small items-center justify-center">
        <Presence state="think" size={size.presenceThink} />
      </View>
      <View className="min-w-0 flex-1">
        <Text variant="rowTitle" numberOfLines={1}>
          {label}
        </Text>
      </View>
      {hints ? <Key label={t('common.overlay.key-enter')} /> : null}
    </Option>
  );
}
