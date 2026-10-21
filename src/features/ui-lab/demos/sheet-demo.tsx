import { createRef, useState, type RefObject } from 'react';
import { View, type TextInput } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { Sheet } from '@/shared/ui/sheet';
import { DemoField } from './demo-field';
import { sheetCopy } from './demo-copy';

const LONG_FIELDS = [
  'title',
  'day',
  'time',
  'repeat',
  'notes',
  'place',
  'remind',
  'share',
] as const;
const SHORT_FIELDS = ['reminder', 'when', 'who'] as const;

type FieldKey = keyof typeof sheetCopy.fields;
type Values = Partial<Record<FieldKey, string>>;

function dirtyName(values: Values, nameKey: FieldKey): string | boolean {
  const changed = Object.values(values).some((value) => !!value);
  if (!changed) return false;
  return values[nameKey]?.trim() || true;
}

type FormProps = {
  fields: readonly FieldKey[];
  values: Values;
  onChange: (key: FieldKey, value: string) => void;
  refs: RefObject<TextInput | null>[];
  onSubmit: () => void;
};

function DemoForm({ fields, values, onChange, refs, onSubmit }: FormProps) {
  return (
    <View>
      {fields.map((key, index) => {
        const last = index === fields.length - 1;
        const multiline = key === 'notes';
        return (
          <DemoField
            key={key}
            label={sheetCopy.fields[key].label}
            value={values[key] ?? ''}
            onChangeText={(value) => onChange(key, value)}
            inputRef={refs[index]}
            multiline={multiline}
            returnKeyType={multiline ? 'default' : last ? 'done' : 'next'}
            onSubmitEditing={last ? onSubmit : () => refs[index + 1]?.current?.focus()}
            testID={`spike-field-${key}`}
          />
        );
      })}
    </View>
  );
}

type Mode = 'long' | 'short' | null;

export function SheetDemo() {
  const [mode, setMode] = useState<Mode>(null);
  const [values, setValues] = useState<Values>({});
  const [saved, setSaved] = useState(0);
  const fields = mode === 'short' ? SHORT_FIELDS : LONG_FIELDS;
  const [refs] = useState(() => LONG_FIELDS.map(() => createRef<TextInput>()));
  const close = () => {
    setMode(null);
    setValues({});
  };
  const save = () => {
    setSaved((count) => count + 1);
    close();
  };
  const first = refs[0] ?? createRef<TextInput>();

  return (
    <View className="gap-3" testID="sheet-demo">
      <Button onPress={() => setMode('long')} testID="spike-open-long">
        <Text>{sheetCopy.openLong}</Text>
      </Button>
      <Button variant="secondary" onPress={() => setMode('short')} testID="spike-open-short">
        <Text>{sheetCopy.openShort}</Text>
      </Button>
      <Text variant="caption" testID="spike-saved">
        {`${sheetCopy.saved} ${saved}`}
      </Text>
      <Sheet
        open={mode !== null}
        onClose={close}
        title={mode === 'short' ? sheetCopy.shortTitle : sheetCopy.longTitle}
        variant="form"
        long={mode === 'long'}
        dirty={dirtyName(values, mode === 'short' ? 'reminder' : 'title')}
        actions={{
          primary: { label: sheetCopy.save, onPress: save, testID: 'spike-save' },
          more:
            mode === 'long'
              ? { label: sheetCopy.more, onPress: () => undefined, testID: 'spike-more' }
              : undefined,
        }}
        initialFocus={first}
        testID="spike-sheet">
        <DemoForm
          fields={fields}
          values={values}
          onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
          refs={refs}
          onSubmit={save}
        />
      </Sheet>
    </View>
  );
}
