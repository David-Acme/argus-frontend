import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { Presence, type PresenceState } from '@/shared/ui/presence';
import { CALL_AVATAR_FILL } from '@/features/voice/constants/call.constant';

type CallAvatarProps = {
  state: PresenceState;
  size: number;
  level?: SharedValue<number>;
  label?: string;
};

export function CallAvatar({ state, size, level, label }: CallAvatarProps) {
  const box = { width: size, height: size };
  return (
    <View className="bg-surface items-center justify-center rounded-full" style={box}>
      <Presence
        state={state}
        size={Math.round(size * CALL_AVATAR_FILL)}
        level={level}
        accessibilityLabel={label}
      />
    </View>
  );
}
