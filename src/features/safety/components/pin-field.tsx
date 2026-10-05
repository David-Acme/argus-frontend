import { View } from 'react-native';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { digitsOnly } from '@/features/safety/model/safety';

type PinFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
};

export function PinField({ label, value, onChange, hint, autoFocus, onSubmit }: PinFieldProps) {
  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      <Input
        value={value}
        onChangeText={(text) => onChange(digitsOnly(text))}
        keyboardType="number-pad"
        secureTextEntry
        autoComplete="off"
        textContentType="oneTimeCode"
        maxLength={8}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        accessibilityLabel={label}
      />
      {hint ? <Text variant="caption">{hint}</Text> : null}
    </View>
  );
}
