import { useState, type RefObject } from 'react';
import { TextInput, View, type LayoutChangeEvent, type NativeSyntheticEvent } from 'react-native';
import { inset, useThemeTokens } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { CommandEmptyState } from './command-empty';
import { CommandList } from './command-list';
import { Key } from './command-rows';
import { CommandScopes } from './command-scopes';
import { optionId } from './listbox';
import type { CommandState } from './use-command';

export type CommandPanelProps = {
  state: CommandState;
  hints?: boolean;
  inputRef?: RefObject<TextInput | null>;
  room?: number;
};

type QueryRowProps = Pick<CommandPanelProps, 'state' | 'hints' | 'inputRef'>;

type KeyEvent = NativeSyntheticEvent<{ key: string }> & { preventDefault?: () => void };

export { Key };

function QueryRow({ state, hints, inputRef }: QueryRowProps) {
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

const heightOf = (event: LayoutChangeEvent) => event.nativeEvent.layout.height;

export function CommandPanel({ state, hints, inputRef, room }: CommandPanelProps) {
  const [head, setHead] = useState(0);
  const [foot, setFoot] = useState(0);
  const fill = room === undefined;
  const maxHeight = fill ? undefined : Math.max(0, room - head - foot - inset.palette.group * 2);
  return (
    <View className={fill ? 'min-h-0 flex-1 basis-0' : undefined}>
      <View onLayout={(event) => setHead(heightOf(event))}>
        <QueryRow state={state} hints={hints} inputRef={inputRef} />
        {state.scopes ? <CommandScopes scopes={state.scopes} /> : null}
      </View>
      {state.empty === null ? (
        <CommandList state={state} hints={hints} maxHeight={maxHeight} />
      ) : (
        <CommandEmptyState state={state} empty={state.empty} hints={hints} fill={fill} />
      )}
      {hints ? (
        <View onLayout={(event) => setFoot(heightOf(event))}>
          <Footer />
        </View>
      ) : null}
    </View>
  );
}
