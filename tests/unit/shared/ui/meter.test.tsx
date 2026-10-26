import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Meter } from '@/shared/ui/meter/meter';

describe('Meter', () => {
  test('tells its share as a named progress bar, clamped to 0–100', () => {
    render(
      <>
        <Meter fraction={0.333} label="Completa tu casa" />
        <Meter fraction={4} label="Memoria" />
        <Meter fraction={-1} label="Vacío" />
      </>
    );
    expect(
      screen.getByRole('progressbar', { name: 'Completa tu casa' }).getAttribute('aria-valuenow')
    ).toBe('33');
    expect(screen.getByRole('progressbar', { name: 'Memoria' }).getAttribute('aria-valuenow')).toBe(
      '100'
    );
    expect(screen.getByRole('progressbar', { name: 'Vacío' }).getAttribute('aria-valuenow')).toBe(
      '0'
    );
  });
});
