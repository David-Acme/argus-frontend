import { afterEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  capabilities,
  news,
  params,
  removal,
  removed,
  reset,
  routes,
  row,
  setRows,
  sync,
} from './feed-stubs';

const { default: NewsScreen } = await import('@/features/home/screens/news-screen');
const { NewsReply } = await import('@/features/home/components/feed/news-reply');

afterEach(reset);

const flush = () => act(() => new Promise((resolve) => globalThis.setTimeout(resolve, 0)));

const episode = (id: string, isRead = true) =>
  row(id, { kind: 'guard_episode', threadKey: 'guard:episode:4' }, { isRead });

describe('Novedades', () => {
  test('the full feed lists every thread under «Novedades» and goes back', () => {
    setRows(Array.from({ length: 12 }, (_, index) => row(String(index + 1))));
    render(<NewsScreen />);
    expect(screen.getByText('Novedades')).toBeDefined();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(routes).toEqual(['back']);
  });

  test('a thread leads with its latest notice and hangs the two before it from its line', () => {
    setRows([episode('9'), episode('8'), episode('7'), episode('6')]);
    render(<NewsScreen />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(screen.getByText(/4 avisos/)).toBeDefined();
    expect(screen.getByText('Aviso 8')).toBeDefined();
    expect(screen.getByText('Aviso 7')).toBeDefined();
    expect(screen.queryByText('Aviso 6')).toBeNull();
    expect(typeof NewsReply).toBe('function');
  });

  test('the filter keeps security or what is still unread, and each says when it is empty', () => {
    capabilities.active = true;
    setRows([episode('9', false), row('3')]);
    render(<NewsScreen />);
    fireEvent.click(screen.getByRole('radio', { name: 'Seguridad' }));
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(screen.getByRole('radio', { name: 'Pendientes' }));
    expect(screen.getByText('Aviso 9')).toBeDefined();
    expect(screen.queryByText('Aviso 3')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Todo' }));
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
  });

  test('without surveillance there is no Seguridad filter, and nothing unread says so', () => {
    capabilities.active = false;
    setRows([row('3')]);
    render(<NewsScreen />);
    expect(screen.queryByRole('radio', { name: 'Seguridad' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Pendientes' }));
    expect(screen.getByText('Estás al día')).toBeDefined();
  });

  test('«Ver más» pages while the server holds older rows, and a failed page offers a retry', async () => {
    let pages = 0;
    setRows([row('1')]);
    news.feed = {
      rows: [],
      hasMore: true,
      loadMore: async () => {
        pages += 1;
        return pages > 1;
      },
    };
    render(<NewsScreen />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    });
    await flush();
    expect(screen.getByText('No pude traer avisos más antiguos')).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    });
    await flush();
    expect(pages).toBe(2);
    expect(screen.getByRole('button', { name: 'Ver más' })).toBeDefined();
  });

  test('an empty feed says what will appear there', () => {
    render(<NewsScreen />);
    expect(screen.getByText('Aquí verás lo que pase en tu casa')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  test('offline it shows what it has and says until when it is up to date', () => {
    setRows([row('1')]);
    sync.offline = true;
    sync.lastAt = new Date(2026, 9, 26, 14, 35).getTime();
    render(<NewsScreen />);
    expect(screen.getByText('Sin conexión · al día hasta las 14:35')).toBeDefined();
    expect(screen.getByText('Aviso 1')).toBeDefined();
  });

  test('each item can be deleted from the full feed, when the role may delete', () => {
    setRows([row('1'), row('2')]);
    const { unmount } = render(<NewsScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Borrar notificación: Aviso 2' }));
    expect(removed).toHaveLength(1);
    unmount();
    removal.allowed = false;
    render(<NewsScreen />);
    expect(screen.queryByRole('button', { name: /Borrar notificación/ })).toBeNull();
  });
});

describe('a link to one notice', () => {
  test('a local notice opens the page it names', async () => {
    params.notificationId = '42';
    setRows([row('42', { url: '/cameras/12' })]);
    render(<NewsScreen />);
    await flush();
    expect(routes).toEqual(['replace:/cameras/12']);
  });

  test('an unknown id waits quietly for the sync, then says the notice is gone', () => {
    params.notificationId = '999';
    sync.ready = false;
    setRows([row('1')]);
    const { unmount } = render(<NewsScreen />);
    expect(screen.queryByText('Este aviso ya no está')).toBeNull();
    expect(screen.getByText('Aviso 1')).toBeDefined();
    unmount();
    sync.ready = true;
    render(<NewsScreen />);
    expect(screen.getByText('Este aviso ya no está')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(routes).toEqual(['replace:/notification']);
  });
});
