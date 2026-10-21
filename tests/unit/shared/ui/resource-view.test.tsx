import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffectsOverrides } from '@/shared/theme';
import { Empty } from '@/shared/ui/resource-view/empty';
import type { Resource } from '@/shared/ui/resource-view/resource';
import { ResourceView, type ResourceCopy } from '@/shared/ui/resource-view/resource-view';
import { Skeleton, SkeletonRow } from '@/shared/ui/resource-view/skeleton';

const COPY: ResourceCopy = {
  loading: 'Cargando',
  retry: 'Reintentar',
  failed: { title: 'Cámaras sin conexión', body: 'Revisa el Wi-Fi.' },
  stale: (age) => `Sin conexión con Argus. Muestro lo de las ${age}.`,
  refused: (owner) => `La agenda está apagada en esta casa. Pídele ${owner} que la active.`,
};

const EMPTY = {
  message: 'Nada pendiente hoy',
  detail: 'Tienes el día libre.',
  action: { label: 'Nuevo recordatorio', onPress: () => undefined },
};

function view(resource: Resource<string>) {
  return render(
    <ResourceView
      resource={resource}
      copy={COPY}
      skeleton={<span data-testid="skeleton" />}
      empty={EMPTY}
      concern={<span data-testid="concern" />}>
      {(data) => <span>{data}</span>}
    </ResourceView>
  );
}

describe('ResourceView', () => {
  test('loading shows its skeleton, busy and named, and never a spinner', () => {
    const { container } = view({ status: 'loading' });
    expect(screen.getByTestId('skeleton')).toBeDefined();
    expect(container.querySelector('[aria-busy="true"]')?.getAttribute('aria-label')).toBe(
      'Cargando'
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  test('ready renders the data', () => {
    view({ status: 'ready', data: 'Luis llegó' });
    expect(screen.getByText('Luis llegó')).toBeDefined();
  });

  test('empty says what will appear and offers one action', () => {
    view({ status: 'empty' });
    expect(screen.getByText('Nada pendiente hoy')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Nuevo recordatorio' })).toBeDefined();
  });

  test('stale keeps the cached data under a notice with its age', () => {
    let retries = 0;
    view({ status: 'stale', data: 'Luis llegó', age: '15:32', retry: () => void (retries += 1) });
    expect(screen.getByText('Sin conexión con Argus. Muestro lo de las 15:32.')).toBeDefined();
    expect(screen.getByText('Luis llegó')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retries).toBe(1);
  });

  test('failed says what failed with Reintentar and the concern slot, never the empty copy', () => {
    let retries = 0;
    view({ status: 'failed', retry: () => void (retries += 1) });
    expect(screen.getByText('Cámaras sin conexión')).toBeDefined();
    expect(screen.getByTestId('concern')).toBeDefined();
    expect(screen.queryByText('Nada pendiente hoy')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retries).toBe(1);
  });

  test('refused names who can change it', () => {
    view({ status: 'refused', owner: 'al propietario' });
    expect(
      screen.getByText('La agenda está apagada en esta casa. Pídele al propietario que la active.')
    ).toBeDefined();
  });

  test('an empty view keeps its follow-ups below the card', () => {
    render(
      <Empty {...EMPTY} presence={<span data-testid="presence" />}>
        <span>Recuérdame pagar el agua</span>
      </Empty>
    );
    expect(screen.getByTestId('presence')).toBeDefined();
    expect(screen.getByText('Recuérdame pagar el agua')).toBeDefined();
  });

  test('a skeleton shimmers and holds a static fill under reduced motion', () => {
    const { container, unmount } = render(<Skeleton shape="title" />);
    expect(container.querySelectorAll('div').length).toBe(2);
    unmount();
    act(() => useEffectsOverrides.setState({ reduceMotion: true }));
    const still = render(<Skeleton shape="title" />);
    expect(still.container.querySelectorAll('div').length).toBe(1);
    still.unmount();
    const rows = render(
      <>
        <SkeletonRow trailing />
        <SkeletonRow short />
      </>
    );
    expect(rows.container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(4);
    act(() => useEffectsOverrides.setState({ reduceMotion: null }));
  });
});
