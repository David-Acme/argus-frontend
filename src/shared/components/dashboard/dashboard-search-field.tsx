import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';

type DashboardSearchFieldProps = {
  placeholder: string;
  filterLabel: string;
  value?: string;
  onChangeText?: (value: string) => void;
  onFilter?: () => void;
};

export function DashboardSearchField({
  placeholder,
  filterLabel,
  value,
  onChangeText,
  onFilter,
}: DashboardSearchFieldProps) {

  return (
    <View className="bg-card flex-row items-center gap-3 rounded-full px-5 shadow-sm shadow-black/[0.07]">
      <Icon name="search" className="text-muted-foreground size-5" />
      <Input
        className="h-12 flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none"
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={filterLabel}
        className="size-9 items-center justify-center rounded-full active:opacity-60"
        onPress={onFilter}>
        <Icon name="filter" className="text-foreground-secondary size-5" />
      </Pressable>
    </View>
  );
}
