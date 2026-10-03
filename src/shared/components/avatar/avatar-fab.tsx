import { Pressable } from 'react-native';
import Avatar from './avatar';

type AvatarFabProps = {
  onPress: () => void;
  size?: number;
  accessibilityLabel?: string;
};

export function AvatarFab({ onPress, size = 64, accessibilityLabel }: AvatarFabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="active:opacity-90"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}>
      <Avatar size={size} state="idle" />
    </Pressable>
  );
}