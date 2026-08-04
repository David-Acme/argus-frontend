import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Text } from '@/shared/components/ui/text';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function Screen() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background">
      <Text className="text-lg font-medium text-foreground">Hello world</Text>

      <Button onPress={() => setDialogOpen(true)}>
        <Text>Abrir diálogo</Text>
      </Button>

      <Button variant="outline" onPress={() => router.push('/(test)')}>
        <Text>Ir a pantalla de prueba</Text>
      </Button>

      <Button variant="secondary" onPress={() => router.push('/orb')}>
        <Text>Ver orbe</Text>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diálogo de prueba</DialogTitle>
            <DialogDescription>Fade + scale con spring nativo.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onPress={() => setDialogOpen(false)}>
              <Text>Cerrar</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
