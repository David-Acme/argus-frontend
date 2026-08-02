import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View>
        <Text>The page you are looking for does not exist.</Text>

        <Link href="/">
          <Text>Go home</Text>
        </Link>
      </View>
    </>
  );
}
