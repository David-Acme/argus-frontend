import { afterEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { news, params, removal, removed, reset, routes, row, setRows } from './feed-stubs';

const { default: NewsScreen } = await import('@/features/home/screens/news-screen');

afterEach(reset);

describe('NewsScreen', () => {
  test('the full feed lists every thread under «Novedades» and goes back', () => {
    setRows(Array.from({ length: 12 }, (_, index) => row(String(index + 1))));
    render(<NewsScreen />);
    expect(screen.getByText('Novedades')).toBeDefined();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(routes).toEqual(['back']);
  });

  test('«Ver más» shows while the server holds older rows', async () => {
    let pages = 0;
    setRows([row('1')]);
    news.feed = {
      rows: [],
      hasMore: true,
      loadMore: async () => {
        pages += 1;
        return true;
      },
    };
    render(<NewsScreen />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    });
    expect(pages).toBe(1);
  });

  test('an empty feed says what will appear there', () => {
    render(<NewsScreen />);
    expect(screen.getByText('Aquí verás lo que pase en tu casa')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull();
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

  test('a link to one notification still opens that notification', () => {
    params.notificationId = '42';
    render(<NewsScreen />);
    expect(screen.getByText('link-screen')).toBeDefined();
  });
});
