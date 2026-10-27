import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Notice } from '@/shared/ui/notice/notice';

describe('Notice', () => {
  test('a card states its title and body and runs its one action', () => {
    let retries = 0;
    render(
      <Notice
        tone="attention"
        icon="wifioff"
        title="Cámaras sin conexión"
        body="Revisa el Wi-Fi."
        action={{ label: 'Reintentar', onPress: () => void (retries += 1) }}
      />
    );
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Cámaras sin conexión')).toBeDefined();
    expect(screen.getByText('Revisa el Wi-Fi.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retries).toBe(1);
  });

  test('an info card and a primary action render without a body', () => {
    render(
      <Notice
        icon="check"
        title="Nada pendiente hoy"
        action={{
          label: 'Nuevo evento',
          onPress: () => undefined,
          primary: true,
          icon: 'plus',
        }}
      />
    );
    expect(screen.getByRole('button', { name: 'Nuevo evento' })).toBeDefined();
  });

  test('a centred empty card keeps its title, its line and its one action', () => {
    let created = 0;
    render(
      <Notice
        centred
        icon="cal"
        title="Nada para hoy"
        body="Pídeselo a Argus o crea tu primer recordatorio."
        action={{ label: 'Nuevo evento', onPress: () => void (created += 1), primary: true }}
      />
    );
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Pídeselo a Argus o crea tu primer recordatorio.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento' }));
    expect(created).toBe(1);
  });

  test('a card draws Estela at 52 px in place of its icon', () => {
    render(<Notice title="Todo tranquilo" presence="happy" />);
    expect(globalThis.document.querySelector('canvas')?.style.width).toBe('52px');
  });

  test('an inline banner joins title and body on one line and keeps its action', () => {
    let presses = 0;
    render(
      <>
        <Notice
          inline
          tone="attention"
          icon="wifioff"
          title="Sin conexión."
          body="Datos de las 15:32."
        />
        <Notice
          inline
          icon="lock"
          title="La agenda está apagada en esta casa."
          action={{ label: 'Pedir', onPress: () => void (presses += 1) }}
        />
      </>
    );
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.getByText('Sin conexión. Datos de las 15:32.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Pedir' }));
    expect(presses).toBe(1);
  });

  test('ok and alert banners lead with a dot of their tone and state one fact', () => {
    render(
      <>
        <Notice inline tone="ok" title="Encontré a tu Argus en tu red." />
        <Notice inline tone="alert" title="Ese código no es de este Argus." />
        <Notice inline tone="alert" icon="alert" title="Sin conexión." />
      </>
    );
    expect(screen.getAllByRole('status')).toHaveLength(3);
    expect(screen.getByText('Encontré a tu Argus en tu red.')).toBeDefined();
    expect(screen.getByText('Ese código no es de este Argus.')).toBeDefined();
  });
});
