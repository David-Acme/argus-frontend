import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@/shared/ui/button';

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
});
