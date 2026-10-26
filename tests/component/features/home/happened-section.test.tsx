import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { HappenedData } from '@/features/home/hooks/use-happened';
import { screenFocus } from '../../../unit/shared/ui/screen-focus';
import '../../../unit/shared/ui/translation-stub';

const pushed: string[] = [];

let retried = 0;

let data: HappenedData;

function happened(overrides: Partial<HappenedData>): HappenedData {
  return {
    visible: true,
    status: 'ready',
    rows: [
      {
        key: 'person-3',
        title: 'Persona desconocida',
        meta: 'Patio trasero · ayer 21:53',
        icon: 'alert',
        attention: true,
        review: true,
      },
      {
        key: 'person-1',
        title: 'Persona detectada',
        meta: 'Puerta principal · 14:45',
        icon: 'user',
        attention: false,
        review: false,
      },
    ],
    retry: () => {
      retried += 1;
    },
    ...overrides,
  };
}

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ setParams: () => undefined, push: (href: string) => pushed.push(href) }),
  useIsFocused: () => screenFocus.focused,
}));

mock.module('@/features/home/hooks/use-happened', () => ({ useHappened: () => data }));

const { HappenedSection } = await import('@/features/home/components/cameras/happened-section');
const { ScreenColumnProvider } = await import('@/shared/ui/screen/screen-column-context');

afterEach(() => {
  pushed.length = 0;
  retried = 0;
});

describe('HappenedSection', () => {
  test('rows carry their place and time, «Revisar» where a review waits, and open Seguridad', () => {
    data = happened({});
    render(<HappenedSection />);
    expect(screen.getByRole('heading', { name: 'Lo que pasó' })).toBeDefined();
    expect(screen.getAllByText('Revisar')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^Persona detectada, Puerta principal/ }));
    expect(pushed).toEqual(['/security']);
  });

  test('in a desktop column it keeps the same rows', () => {
    data = happened({});
    render(
      <ScreenColumnProvider value>
        <HappenedSection />
      </ScreenColumnProvider>
    );
    expect(screen.getByText('Patio trasero · ayer 21:53')).toBeDefined();
  });

  test('before the first answer it shows skeleton rows in its final layout', () => {
    data = happened({ status: 'loading', rows: [] });
    const { container } = render(<HappenedSection />);
    expect(screen.getByRole('heading', { name: 'Lo que pasó' })).toBeDefined();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  test('an empty feed says all is quiet and offers Seguridad', () => {
    data = happened({ status: 'empty', rows: [] });
    render(<HappenedSection />);
    expect(screen.getByText('Todo tranquilo')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Seguridad' }));
    expect(pushed).toEqual(['/security']);
  });

  test('a failed first load offers a retry', () => {
    data = happened({ status: 'failed', rows: [] });
    render(<HappenedSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retried).toBe(1);
  });

  test('a role that cannot read the guard sees nothing', () => {
    data = happened({ visible: false });
    const { container } = render(<HappenedSection />);
    expect(container.textContent).toBe('');
  });
});
