import { clsx } from 'clsx';
import { useState, type Ref } from 'react';
import { TextInput, View } from 'react-native';
import { inset, type as typeSteps, typeRoles, useThemeTokens } from '@/shared/theme';
import { useTypeScale } from '@/shared/ui/text';
import { CodeField, type CodeFieldProps } from './code-field';
import { FRAME_BORDER, FieldShell, fieldState, frameClass } from './field-shell';
import {
  SECRET_TRAITS,
  TEXT_TRAITS,
  submitTraits,
  type FieldSubmit,
  type InputTraits,
  type SecretContent,
  type TextContent,
} from './input-traits';

type Named = { label: string; placeholder?: string } | { label?: undefined; placeholder: string };

type FieldBase = Named & {
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  error?: string;
  ref?: Ref<TextInput>;
};

export type TextFieldProps = FieldBase & {
  kind?: 'text';
  content?: TextContent;
  submit?: FieldSubmit;
};

export type SecretFieldProps = FieldBase & {
  kind: 'secret';
  content?: SecretContent;
  submit?: FieldSubmit;
};

export type MultilineFieldProps = FieldBase & { kind: 'multiline' };

export type FieldProps = TextFieldProps | SecretFieldProps | MultilineFieldProps | CodeFieldProps;

type EntryProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  error?: string;
  submit?: FieldSubmit;
  ref?: Ref<TextInput>;
  traits: InputTraits;
  multiline: boolean;
};

const MULTILINE_LINES = 5;

const ENTRY_TEXT = 'web:font-system web:outline-none web:caret-accent text-entry text-text';

function useMultilineCap(multiline: boolean) {
  const { factor } = useTypeScale('body');
  if (!multiline) return undefined;
  return {
    maxHeight: typeSteps.body.line * factor * MULTILINE_LINES + inset.field.multiY * 2,
    lineHeight: typeSteps.body.line * factor,
  };
}

function Entry({
  label,
  placeholder,
  value,
  onChangeText,
  hint,
  error,
  submit,
  ref,
  traits,
  multiline,
}: EntryProps) {
  const { color } = useThemeTokens();
  const [focused, setFocused] = useState(false);
  const { style } = useTypeScale('entry');
  const cap = useMultilineCap(multiline);
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <View
        className={clsx(
          frameClass(fieldState(focused, error)),
          multiline ? 'min-h-field-multi items-stretch' : 'min-h-field items-stretch'
        )}
        style={FRAME_BORDER}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          aria-label={label ?? placeholder}
          accessibilityHint={error ?? hint}
          placeholderTextColor={color['text-3']}
          cursorColor={color.accent}
          selectionColor={color.accent}
          maxFontSizeMultiplier={typeRoles.entry.maxScale}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...traits}
          {...submitTraits(submit)}
          className={clsx(
            ENTRY_TEXT,
            'min-w-0 flex-1',
            multiline && 'py-field-multi-y web:field-sizing-content'
          )}
          style={[style, cap]}
        />
      </View>
    </FieldShell>
  );
}

export function Field(props: FieldProps) {
  if (props.kind === 'code') return <CodeField {...props} />;
  if (props.kind === 'secret')
    return (
      <Entry {...props} traits={SECRET_TRAITS[props.content ?? 'password']} multiline={false} />
    );
  if (props.kind === 'multiline') return <Entry {...props} traits={{}} multiline />;
  return <Entry {...props} traits={TEXT_TRAITS[props.content ?? 'plain']} multiline={false} />;
}
