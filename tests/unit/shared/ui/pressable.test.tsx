import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { PressableSurface } from '@/shared/ui/pressable/pressable-surface';
import { useSurfacePress } from '@/shared/ui/pressable/use-surface-press';

describe('PressableSurface', () => {
  test('carries its role and label and presses once per tap', () => {
    let presses = 0;
    render(
      <PressableSurface
        a11y={{ label: 'Abrir Cocina', role: 'button' }}
        onPress={() => (presses += 1)}>
        <Text>Cocina</Text>
      </PressableSurface>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Cocina' }));
    expect(presses).toBe(1);
  });

  test('a disabled surface says so and ignores the tap', () => {
    let presses = 0;
    render(
      <PressableSurface
        a11y={{ label: 'Guardar', role: 'button' }}
        onPress={() => (presses += 1)}
        disabled>
        <Text>Guardar</Text>
      </PressableSurface>
    );
    const button = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.click(button);
    expect(presses).toBe(0);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  test('a switch surface exposes its checked state', () => {
    render(
      <PressableSurface a11y={{ label: 'Modo Noche', role: 'switch', checked: true }}>
        <Text>Modo Noche</Text>
      </PressableSurface>
    );
    expect(screen.getByRole('switch', { name: 'Modo Noche' }).getAttribute('aria-checked')).toBe(
      'true'
    );
  });

  test('a press-in re-renders the surface only when it draws a pressed fill', () => {
    const renders = (fill: boolean) => {
      let count = 0;
      const { result } = renderHook(() => {
        count += 1;
        return useSurfacePress({ pressed: { scale: 'icon', fill } });
      });
      const before = count;
      act(() => result.current.onPressIn());
      act(() => result.current.onPressOut());
      return count - before;
    };
    expect(renders(false)).toBe(0);
    expect(renders(true)).toBe(2);
  });
});
