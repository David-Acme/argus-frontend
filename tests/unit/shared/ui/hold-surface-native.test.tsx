import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { HoldSurface } from '@/shared/ui/pressable/hold-surface.native';
import { PressableSurface } from '@/shared/ui/pressable/pressable-surface.native';

const hold = { onStart: () => undefined, onEnd: () => undefined };

describe('PressableSurface with a hold on native', () => {
  test('names its role and label and says when it is selected', () => {
    render(
      <PressableSurface a11y={{ label: 'Hablar', role: 'button', selected: true }} hold={hold}>
        <Text>Hablar</Text>
      </PressableSurface>
    );
    const button = screen.getByRole('button', { name: 'Hablar' });
    expect(button.getAttribute('aria-selected')).toBe('true');
  });

  test('a disabled hold surface says so', () => {
    render(
      <HoldSurface a11y={{ label: 'Arriba', role: 'button' }} hold={hold} disabled>
        <Text>Arriba</Text>
      </HoldSurface>
    );
    expect(screen.getByRole('button', { name: 'Arriba' }).getAttribute('aria-disabled')).toBe(
      'true'
    );
  });
});
