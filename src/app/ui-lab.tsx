import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';

const OPTIONS = [
  { value: 'events', label: 'Solo eventos' },
  { value: 'continuous', label: 'Continua' },
];

export default function UiLabScreen() {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState('events');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <View className="flex-1 items-center justify-center gap-4 p-6" testID="ui-lab">
      <Text variant="body" testID="ui-lab-dialog-state">
        {open ? 'dialog-open' : 'dialog-closed'}
      </Text>
      <Text variant="body" testID="ui-lab-mode">
        {mode}
      </Text>
      <Button onPress={() => setOpen(true)} testID="ui-lab-open">
        <Text>Abrir diálogo</Text>
      </Button>
      <Button variant="secondary" onPress={() => { setLocked(true); setOpen(true); }} testID="ui-lab-open-locked">
        <Text>Abrir diálogo fijo</Text>
      </Button>
      <AdaptiveDialog
        open={open}
        onOpenChange={(next) => { setOpen(next); if (!next) setLocked(false); }}
        dismissible={!locked}
        title="Editar cámara"
        description="Laboratorio de componentes"
        closeLabel="Cerrar"
        footer={
          <Button variant="secondary" onPress={() => setOpen(false)} testID="ui-lab-cancel">
            <Text>Cancelar</Text>
          </Button>
        }>
        <View className="gap-3" testID="ui-lab-dialog-body">
          <AdaptiveSelect
            options={OPTIONS}
            value={mode}
            onChange={setMode}
            title="Grabación"
            closeLabel="Cerrar"
            searchPlaceholder="Buscar"
            emptyLabel="Sin opciones"
            trigger={<SelectField label={OPTIONS.find((option) => option.value === mode)?.label} testID="ui-lab-select" />}
          />
        </View>
      </AdaptiveDialog>
    </View>
  );
}
