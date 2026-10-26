import { afterEach, describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { capabilities, news, reads, reset, routes, row, setRows } from './feed-stubs';
import { setWindowWidth } from '../../../shared/ui/window-width';

const { NewsSection } = await import('@/features/home/components/feed/news-section');
const { NewsItem } = await import('@/features/home/components/feed/news-item');
const { Feed } = await import('@/shared/ui/feed-item');
const { Screen, ScreenColumn, ScreenColumns } = await import('@/shared/ui/screen');

afterEach(() => {
  reset();
  setWindowWidth(360);
});

const many = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    row(String(index + 1), {}, { title: `Quién ${index + 1}` })
  );

function renderItem(index = 0) {
  const thread = news.threads[index];
  if (!thread) throw new Error('no thread');
  return render(
    <Feed>
      <NewsItem
        thread={thread}
        now={new Date(2026, 9, 26, 15, 0).getTime()}
        onRead={(read) => reads.push(read.key)}
      />
    </Feed>
  );
}

describe('NewsSection', () => {
  test('on a phone it is a card with the latest five and «Ver todo» to the full feed', () => {
    setRows(many(9));
    render(<NewsSection />);
    expect(screen.getByRole('heading', { name: 'Novedades' })).toBeDefined();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Quién 1')).toBeDefined();
    expect(screen.queryByText('Quién 6')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Ver todo' }));
    expect(routes).toEqual(['/notification']);
  });

  test('in a desktop column it shows as many as the window height fits', () => {
    setWindowWidth(1280);
    setRows(many(20));
    render(
      <Screen columns>
        <ScreenColumns>
          <ScreenColumn label="Novedades">
            <NewsSection />
          </ScreenColumn>
        </ScreenColumns>
      </Screen>
    );
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(8);
  });

  test('with nothing to show, or no right to read, it renders nothing', () => {
    const empty = render(<NewsSection />);
    expect(empty.container.textContent).toBe('');
    empty.unmount();
    setRows(many(2));
    news.readable = false;
    const refused = render(<NewsSection />);
    expect(refused.container.textContent).toBe('');
  });
});

describe('NewsItem', () => {
  test('who, when and what, with the unread dot until it is used', () => {
    setRows([row('1', {}, { title: 'Cocina', body: 'Luis llegó a casa.', isRead: false })]);
    renderItem();
    expect(screen.getByText('Cocina')).toBeDefined();
    expect(screen.getByText('14:35')).toBeDefined();
    expect(screen.getByText('Luis llegó a casa.')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Sin leer' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Cocina/ }));
    expect(reads).toEqual(['row:1']);
    expect(routes).toEqual([]);
  });

  test('a module request offers «Activar» inline, and using it reads the item', () => {
    setRows([
      row(
        '1',
        { kind: 'module_request', moduleId: 'productivity' },
        { title: 'Carlos', body: 'Quiere usar la agenda.', isRead: false }
      ),
    ]);
    renderItem();
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(reads).toEqual(['row:1']);
  });

  test('a request for a module already on, or from someone who cannot turn it on, offers nothing', () => {
    setRows([row('1', { kind: 'module_request', moduleId: 'productivity' }, { title: 'Carlos' })]);
    capabilities.active = true;
    const active = renderItem();
    expect(screen.queryByRole('button', { name: 'Activar' })).toBeNull();
    active.unmount();
    capabilities.active = false;
    capabilities.manages = false;
    renderItem();
    expect(screen.queryByRole('button', { name: 'Activar' })).toBeNull();
  });

  test('an episode offers «Revisar», which reads it and opens it', () => {
    setRows([
      row(
        '1',
        { kind: 'guard_episode', url: '/security/3' },
        { title: 'Patio trasero', isRead: false }
      ),
    ]);
    renderItem();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));
    expect(reads).toEqual(['row:1']);
    expect(routes).toEqual(['/security/3']);
  });

  test('a message offers «Responder» into the conversation', () => {
    setRows([row('1', { kind: 'household_message', counterpartId: 7 }, { title: 'Luis' })]);
    renderItem();
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(routes).toEqual(['/conversations/7']);
  });

  test('a read item that leads nowhere is not a button, and a thread counts its notices', () => {
    setRows([
      row('1', { threadKey: 'digest' }),
      row('2', { threadKey: 'digest' }, { createdAt: new Date(2026, 9, 25, 21, 53).getTime() }),
    ]);
    renderItem();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('14:35 · 2 avisos')).toBeDefined();
  });

  test('yesterday reads «Ayer» with its time', () => {
    setRows([row('1', {}, { createdAt: new Date(2026, 9, 25, 21, 53).getTime() })]);
    renderItem();
    expect(screen.getByText('Ayer 21:53')).toBeDefined();
  });

  test('what Argus says carries Estela instead of a glyph', () => {
    setRows([row('1', { kind: 'assistant_task' }, { title: 'Resumen del día', body: '' })]);
    const { container } = renderItem();
    expect(screen.getByText('Argus')).toBeDefined();
    expect(screen.getByText('Resumen del día')).toBeDefined();
    expect(container.querySelector('canvas')).not.toBeNull();
  });
});
