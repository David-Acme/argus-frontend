import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@/shared/ui/button/button';
import { HoldButton } from '@/shared/ui/button/hold-button';

describe('Button', () => {
  test('every variant renders its label as the accessible name', () => {
    render(
      <>
        <Button label="Primario" variant="primary" onPress={() => undefined} />
        <Button label="Secundario" onPress={() => undefined} />
        <Button label="Texto" variant="ghost" compact onPress={() => undefined} />
        <Button label="Peligro" variant="danger" icon="siren" onPress={() => undefined} />
        <Button label="Casa" glass compact onPress={() => undefined} />
      </>
    );
    for (const name of ['Primario', 'Secundario', 'Texto', 'Peligro', 'Casa']) {
      expect(screen.getByRole('button', { name })).toBeDefined();
    }
  });

  test('an icon-only button is named by its label', () => {
    let presses = 0;
    render(
      <Button
        iconOnly
        icon="search"
        label="Buscar"
        filled
        onPress={() => {
          presses += 1;
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(presses).toBe(1);
  });

  test('the floating new button is an icon-only button named by its label', () => {
    let presses = 0;
    render(<Button iconOnly fab icon="plus" label="Nuevo" onPress={() => void (presses += 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo' }));
    expect(presses).toBe(1);
  });

  test('a press that is still running ignores the next press and shows busy', async () => {
    let presses = 0;
    let finish = () => undefined as void;
    const action = () => {
      presses += 1;
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    };
    render(<Button label="Guardar" variant="primary" onPress={action} />);
    const button = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(presses).toBe(1);
    expect(button.getAttribute('aria-busy')).toBe('true');
    await act(async () => finish());
    expect(button.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(button);
    expect(presses).toBe(2);
  });

  test('busy and disabled buttons do not press', () => {
    let presses = 0;
    render(
      <>
        <Button
          label="Ocupado"
          busy
          onPress={() => {
            presses += 1;
          }}
        />
        <Button
          label="Apagado"
          disabled
          onPress={() => {
            presses += 1;
          }}
        />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ocupado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagado' }));
    expect(presses).toBe(0);
  });

  test('a button can say more to a screen reader than it shows', () => {
    render(
      <Button
        compact
        glass
        label={{ shown: 'Ver', spoken: 'Ver Cocina' }}
        onPress={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: 'Ver Cocina' }).textContent).toBe('Ver');
  });

  test('a hold button asks on a tap and acts once the hold completes', async () => {
    const pressed: string[] = [];
    const hold = { onHold: () => void pressed.push('hold'), hint: 'Mantén pulsado' };
    const { unmount } = render(
      <Button compact label="SOS" hold={hold} onPress={() => void pressed.push('tap')} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'SOS' }));
    expect(pressed).toEqual(['tap']);
    unmount();
    render(<HoldButton compact label="SOS" hold={hold} onPress={() => void pressed.push('tap')} />);
    const button = screen.getByRole('button', { name: 'SOS' });
    await act(async () => {
      fireEvent.mouseDown(button, { buttons: 1 });
      await new Promise((resolve) => setTimeout(resolve, 120));
    });
    fireEvent.click(button);
    expect(pressed).toEqual(['tap', 'hold']);
  });

  test('an ink icon button is a round filled control named by its label', () => {
    let pressed = 0;
    render(
      <Button
        iconOnly
        ink
        icon="mic"
        label="Hablar con Argus"
        onPress={() => {
          pressed += 1;
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hablar con Argus' }));
    expect(pressed).toBe(1);
  });
});
