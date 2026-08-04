import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export default function TestScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background">
      <Text className="text-2xl font-bold text-foreground">Pantalla de prueba</Text>
      <Button variant="secondary" onPress={() => router.push('/orb')}>
        <Text>Ver orbe</Text>
      </Button>

      <Button onPress={() => router.back()}>
        <Text>Volver</Text>
      </Button>
    </View>
  );
}
