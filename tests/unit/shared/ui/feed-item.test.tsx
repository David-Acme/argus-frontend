import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Feed, FeedItem } from '@/shared/ui/feed-item/feed-item';

describe('FeedItem', () => {
  test('a feed lists its items with who, when and text', () => {
    render(
      <Feed>
        <FeedItem leading={null} who="Cocina" when="14:45" text="Luis llegó a casa." />
        <FeedItem
          leading={null}
          who="Recordatorio"
          when="12:00"
          text="Llamar al plomero venció hace 1 h."
        />
      </Feed>
    );
    expect(screen.getByRole('list')).toBeDefined();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Cocina')).toBeDefined();
    expect(screen.getByText('14:45')).toBeDefined();
    expect(screen.getByText('Luis llegó a casa.')).toBeDefined();
  });

  test('an unread item names its dot and runs the actions under its text', () => {
    let activated = 0;
    render(
      <Feed>
        <FeedItem
          leading={<span data-testid="avatar" />}
          who="Carlos"
          when="14:35"
          text="Quiere usar la agenda y los proyectos."
          unreadLabel="Sin leer"
          thread
          actions={<button onClick={() => (activated += 1)}>Activar</button>}
        />
      </Feed>
    );
    expect(screen.getByRole('img', { name: 'Sin leer' })).toBeDefined();
    expect(screen.getByTestId('avatar')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(activated).toBe(1);
  });

  test('a pressable item names itself by its words and keeps its actions apart', () => {
    const pressed: string[] = [];
    render(
      <Feed>
        <FeedItem
          leading={null}
          who="Patio trasero"
          when="21:53"
          text="Persona desconocida."
          unreadLabel="Sin leer"
          onPress={() => pressed.push('row')}
          actions={<button onClick={() => pressed.push('action')}>Revisar</button>}
        />
      </Feed>
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Sin leer, Patio trasero, 21:53, Persona desconocida.' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));
    expect(pressed).toEqual(['row', 'action']);
  });

  test('a long title keeps to two lines and its time and count stay on one', () => {
    render(
      <Feed>
        <FeedItem
          leading={null}
          who="Perdí la visión de la cámara Cocina: girada"
          when="Ayer 5:52 PM · 26 avisos"
          text="Está girada: ya no vigila la misma zona."
        />
      </Feed>
    );
    const title = screen.getByText('Perdí la visión de la cámara Cocina: girada');
    const meta = screen.getByText('Ayer 5:52 PM · 26 avisos');
    expect(title.className).toContain('WebkitBoxOrient');
    expect(meta.className).toContain('whiteSpace');
    expect(title.parentElement?.parentElement).toBe(meta.parentElement);
  });

  test('a read item shows no unread dot', () => {
    render(<FeedItem leading={null} who="Argus" when="14:40" text="Resumen del día." />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
