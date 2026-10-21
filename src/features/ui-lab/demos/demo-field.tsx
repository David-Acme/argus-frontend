import { useState, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type ReturnKeyTypeOptions } from 'react-native';
import { useUniwind } from 'uniwind';
import { tokens } from '@/shared/theme/tokens';

const { color, radius, size, space, type, typeRoles } = tokens;
const MULTILINE_LINES = 5;
const FIELD_PAD = 14;
const BORDER = 1.5;

const styles = StyleSheet.create({
  field: { marginTop: 14 },
  label: { marginBottom: 6, fontSize: typeRoles.label.size, lineHeight: typeRoles.label.line, fontWeight: '600' },
  input: { minHeight: size.field, borderRadius: radius.well, paddingHorizontal: FIELD_PAD, borderWidth: BORDER, fontSize: type.body.size },
  multi: {
    minHeight: 76,
    maxHeight: type.body.line * MULTILINE_LINES + space[3] * 2,
    paddingTop: space[3],
    paddingBottom: space[3],
    lineHeight: type.body.line,
    textAlignVertical: 'top',
  },
});

export type DemoFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  inputRef?: Ref<TextInput>;
  multiline?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  testID?: string;
};

export function DemoField({ label, value, onChangeText, inputRef, multiline, returnKeyType, onSubmitEditing, testID }: DemoFieldProps) {
  const { theme } = useUniwind();
  const palette = color[theme === 'dark' ? 'dark' : 'light'];
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text maxFontSizeMultiplier={typeRoles.label.maxScale} style={[styles.label, { color: palette.text }]}>
        {label}
      </Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        scrollEnabled={multiline}
        returnKeyType={returnKeyType}
        submitBehavior={multiline ? 'newline' : returnKeyType === 'next' ? 'submit' : 'blurAndSubmit'}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        testID={testID}
        maxFontSizeMultiplier={type.body.maxScale}
        style={[
          styles.input,
          multiline && styles.multi,
          {
            color: palette.text,
            backgroundColor: focused ? palette.surface : palette.fill,
            borderColor: focused ? palette.text : 'transparent',
          },
        ]}
      />
    </View>
  );
}
