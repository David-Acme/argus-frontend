import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '../../shared/ui/translation-stub';

const sent: (number | undefined)[] = [];

mock.module('@/shared/libs/service-action', () => ({
  runServiceAction: async ({ call }: { call: () => Promise<unknown> }) => call(),
}));
mock.module('@/features/safety/services/safety.service', () => ({
  safetyService: {
    panic: async (environmentId?: number) => {
      sent.push(environmentId);
      return { ok: true, info: { sent: true }, errors: null, status: 200 };
    },
  },
}));

const { SosButton } = await import('@/features/safety/components/sos-button');

afterEach(() => {
  sent.length = 0;
});

describe('SosButton', () => {
  test('a tap asks first, and the confirmation sends the alert for the place', async () => {
    render(<SosButton environmentId={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'SOS' }));
    expect(screen.getByText('¿Pedir ayuda?')).toBeDefined();
    expect(sent).toEqual([]);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pedir ayuda' }));
    });
    expect(sent).toEqual([2]);
  });

  test('holding sends at once without asking, and the band says to hold', async () => {
    render(<SosButton band />);
    const button = screen.getByRole('button', { name: 'SOS · mantén' });
    await act(async () => {
      fireEvent.mouseDown(button, { buttons: 1 });
      await new Promise((resolve) => setTimeout(resolve, 120));
    });
    expect(sent).toEqual([undefined]);
    expect(screen.queryByText('¿Pedir ayuda?')).toBeNull();
  });
});
