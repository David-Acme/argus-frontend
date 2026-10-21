import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { PressableSurface } from '@/shared/ui/pressable/pressable-surface.native';

describe('PressableSurface on native', () => {
  test('names its role and label and presses once per tap', () => {
    let presses = 0;
    render(
      <PressableSurface
        a11y={{ label: 'Abrir Cocina', role: 'button' }}
        onPress={() => {
          presses += 1;
        }}>
        <Text>Cocina</Text>
      </PressableSurface>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Cocina' }));
    expect(presses).toBe(1);
  });
});
