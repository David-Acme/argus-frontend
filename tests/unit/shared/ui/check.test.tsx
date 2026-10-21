import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Check } from '@/shared/ui/check/check';

describe('Check', () => {
  test('each state maps to the checkbox state', () => {
    render(
      <>
        <Check state="open" label="Pagar la luz" />
        <Check state="overdue" label="Llamar al plomero" />
        <Check state="progress" label="Comprar cajas" />
        <Check state="done" label="Yoga" />
      </>
    );
    expect(
      screen.getByRole('checkbox', { name: 'Pagar la luz' }).getAttribute('aria-checked')
    ).toBe('false');
    expect(
      screen.getByRole('checkbox', { name: 'Llamar al plomero' }).getAttribute('aria-checked')
    ).toBe('false');
    expect(
      screen.getByRole('checkbox', { name: 'Comprar cajas' }).getAttribute('aria-checked')
    ).toBe('mixed');
    expect(screen.getByRole('checkbox', { name: 'Yoga' }).getAttribute('aria-checked')).toBe(
      'true'
    );
  });

  test('a toggleable check presses', () => {
    let toggles = 0;
    render(<Check state="open" label="Pagar la luz" onToggle={() => (toggles += 1)} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pagar la luz' }));
    expect(toggles).toBe(1);
  });
});
