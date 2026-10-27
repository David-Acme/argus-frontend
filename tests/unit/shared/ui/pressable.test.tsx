import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { PressableSurface } from '@/shared/ui/pressable/pressable-surface';
import { useSurfacePress } from '@/shared/ui/pressable/use-surface-press';

const HOLD_WAIT_MS = 300;

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

  test('a surface that grows into its slot keeps its role, label and tap', () => {
    let presses = 0;
    render(
      <PressableSurface
        a11y={{ label: 'Abrir Patio', role: 'button' }}
        pressed={{ grow: true }}
        onPress={() => (presses += 1)}>
        <Text>Patio</Text>
      </PressableSurface>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Patio' }));
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

  test('a held surface starts after the hold delay and ends on release, and a tap only taps', async () => {
    const steps: string[] = [];
    const hold = { onStart: () => steps.push('start'), onEnd: () => steps.push('end') };
    render(
      <PressableSurface
        a11y={{ label: 'Hablar', role: 'button' }}
        hold={hold}
        onPress={() => steps.push('tap')}>
        <Text>Hablar</Text>
      </PressableSurface>
    );
    const button = screen.getByRole('button', { name: 'Hablar' });
    fireEvent.click(button);
    expect(steps).toEqual(['tap']);
    fireEvent.mouseDown(button, { button: 0 });
    await act(() => Bun.sleep(HOLD_WAIT_MS));
    expect(steps).toEqual(['tap', 'start']);
    fireEvent.mouseUp(button, { button: 0 });
    fireEvent.click(button);
    expect(steps).toEqual(['tap', 'start', 'end']);
  });

  test('a press that ends before the hold delay never starts the hold', async () => {
    const steps: string[] = [];
    const hold = { onStart: () => steps.push('start'), onEnd: () => steps.push('end') };
    render(
      <PressableSurface a11y={{ label: 'Hablar', role: 'button' }} hold={hold}>
        <Text>Hablar</Text>
      </PressableSurface>
    );
    const button = screen.getByRole('button', { name: 'Hablar' });
    fireEvent.mouseDown(button, { button: 0 });
    fireEvent.mouseUp(button, { button: 0 });
    await act(() => Bun.sleep(HOLD_WAIT_MS));
    expect(steps).toEqual([]);
  });

  test('a disabled held surface never starts', async () => {
    const steps: string[] = [];
    const hold = { onStart: () => steps.push('start'), onEnd: () => steps.push('end') };
    render(
      <PressableSurface a11y={{ label: 'Hablar', role: 'button' }} hold={hold} disabled>
        <Text>Hablar</Text>
      </PressableSurface>
    );
    const button = screen.getByRole('button', { name: 'Hablar' });
    fireEvent.mouseDown(button, { button: 0 });
    await act(() => Bun.sleep(HOLD_WAIT_MS));
    fireEvent.mouseUp(button, { button: 0 });
    expect(steps).toEqual([]);
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
