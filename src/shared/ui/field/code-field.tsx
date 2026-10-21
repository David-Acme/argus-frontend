import { clsx } from 'clsx';
import { useState, type Ref } from 'react';
import { TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { inset, motion, useEffects, useThemeTokens } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import { FieldShell } from './field-shell';
import { CODE_TRAITS, submitTraits, type FieldSubmit } from './input-traits';

export type CodeFieldProps = {
  kind: 'code';
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  submit?: FieldSubmit;
  ref?: Ref<TextInput>;
};

type CodeBoxProps = { char: string | undefined; focused: boolean; invalid: boolean };

const CODE_LENGTH = 6;

const BOXES = Array.from({ length: CODE_LENGTH }, (_, index) => index);

const BOX_BORDER = { borderWidth: inset.field.codeBorder };

const BLINK = {
  animationName: { '50%': { opacity: 0 } },
  animationDuration: motion.caretBlink,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'steps(1)',
} as const;

function Caret() {
  const { reduceMotion } = useEffects();
  return (
    <Animated.View
      className="w-caret-width h-caret-height bg-accent"
      style={reduceMotion ? undefined : BLINK}
    />
  );
}

function CodeBox({ char, focused, invalid }: CodeBoxProps) {
  const ring = focused || invalid;
  return (
    <View
      className={clsx(
        'w-code-box-width h-code-box-height rounded-well items-center justify-center',
        ring ? 'bg-surface' : 'bg-fill',
        invalid ? 'border-alert' : 'border-text'
      )}
      style={ring ? BOX_BORDER : undefined}>
      {char ? <Text variant="code">{char}</Text> : focused ? <Caret /> : null}
    </View>
  );
}

export function CodeField({ label, value, onChangeText, error, submit, ref }: CodeFieldProps) {
  const { color } = useThemeTokens();
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, CODE_LENGTH - 1);
  return (
    <FieldShell error={error} top="code">
      <View className="gap-field-code-gap flex-row justify-center">
        {BOXES.map((index) => (
          <CodeBox
            key={index}
            char={value[index]}
            focused={focused && index === active}
            invalid={Boolean(error)}
          />
        ))}
        <TextInput
          ref={ref}
          disableFullscreenUI
          value={value}
          onChangeText={(text) => onChangeText(text.toUpperCase())}
          maxLength={CODE_LENGTH}
          aria-label={label}
          accessibilityHint={error}
          caretHidden
          selectionColor={color.accent}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...CODE_TRAITS}
          {...submitTraits(submit)}
          className="web:outline-none absolute inset-0 opacity-0"
        />
      </View>
    </FieldShell>
  );
}
