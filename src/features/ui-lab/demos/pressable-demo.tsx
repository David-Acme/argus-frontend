import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function PressableDemo() {
  return (
    <>
      <LabCase id="fill" block>
        <PressableSurface
          a11y={{ label: copy.openKitchen, role: 'button' }}
          onPress={noop}
          pressed={{ fill: true }}
          className="min-h-row px-row-x justify-center">
          <Text variant="rowTitle">{copy.kitchen}</Text>
        </PressableSurface>
      </LabCase>
      <LabCase id="scale">
        <PressableSurface
          a11y={{ label: copy.openKitchen, role: 'button' }}
          onPress={noop}
          haptic="selection"
          pressed={{ scale: 'surface' }}
          className="min-h-button rounded-button bg-fill px-button-x justify-center">
          <Text variant="button">{copy.kitchen}</Text>
        </PressableSurface>
      </LabCase>
      <LabCase id="disabled">
        <PressableSurface
          a11y={{ label: copy.disabled, role: 'button' }}
          onPress={noop}
          disabled
          className="min-h-button rounded-button bg-fill px-button-x justify-center">
          <Text variant="button">{copy.disabled}</Text>
        </PressableSurface>
      </LabCase>
    </>
  );
}
