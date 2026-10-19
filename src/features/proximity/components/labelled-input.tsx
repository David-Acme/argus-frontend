import { View } from 'react-native';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';

type LabelledInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  numeric?: boolean;
};

export function LabelledInput({ label, value, onChange, placeholder, error, numeric = false }: LabelledInputProps) {
  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? 'numbers-and-punctuation' : 'default'}
        variant={error ? 'error' : 'default'}
      />
      {error ? (
        <Text variant="caption" className="text-error-strong">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
