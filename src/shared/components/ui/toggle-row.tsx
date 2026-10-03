import { View } from 'react-native';
import { Switch } from '@/shared/components/ui/switch';
import { Text } from '@/shared/components/ui/text';

type ToggleRowProps = {
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

export function ToggleRow({ label, hint, value, disabled, onChange }: ToggleRowProps) {
  return (
    <View className="min-h-11 flex-row items-center justify-between gap-3 py-1.5">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="body">{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      <Switch value={value} accessibilityLabel={label} disabled={disabled} onChange={onChange} />
    </View>
  );
}
