import { IS_NATIVE } from '@/shared/constants';
import { Stack } from 'expo-router';

export default function WelcomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 240,
        animationTypeForReplace: 'push',
        gestureEnabled: true,
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pairing/index" />
      <Stack.Protected guard={IS_NATIVE}>
        <Stack.Screen name="invitation/index" />
        <Stack.Screen name="privacy/index" />
        <Stack.Screen name="face/index" />
        <Stack.Screen name="modules/index" />
        <Stack.Screen name="voice/index" />
      </Stack.Protected>
    </Stack>
  );
}
