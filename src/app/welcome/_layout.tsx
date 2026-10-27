import { Stack } from 'expo-router';
import { IS_NATIVE } from '@/shared/constants';
import { WELCOME_ROUTES } from '@/features/auth';

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
      {WELCOME_ROUTES.open.map((name) => (
        <Stack.Screen key={name} name={name} />
      ))}
      <Stack.Protected guard={IS_NATIVE}>
        {WELCOME_ROUTES.native.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}
