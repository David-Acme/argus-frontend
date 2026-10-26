import { afterEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { HomePerson } from '@/features/home/model/home-people';
import { people, reset } from './feed-stubs';
import { setWindowWidth } from '../../../shared/ui/window-width';

const { HomePeopleSection } = await import('@/features/home/components/feed/home-people-section');
const { Screen, ScreenColumn, ScreenColumns } = await import('@/shared/ui/screen');

afterEach(() => {
  reset();
  setWindowWidth(360);
});

const today = new Date();

const at = (hours: number, minutes: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

const person = (
  id: string,
  name: string,
  state: HomePerson['state'],
  since: Date | null,
  self = false
): HomePerson => ({
  id,
  name,
  initial: name.charAt(0),
  self,
  state,
  since,
});

const HOUSEHOLD = [
  person('1', 'Ana', 'home', at(0, 10), true),
  person('2', 'Luis', 'home', at(0, 45)),
  person('3', 'Carlos', 'away', new Date(2020, 0, 5, 9, 10)),
  person('4', 'Rosa', 'unknown', null),
];

describe('HomePeopleSection', () => {
  test('on a phone it lists who is home and since when, me first and named as me', () => {
    people.people = HOUSEHOLD;
    render(<HomePeopleSection />);
    expect(screen.getByRole('heading', { name: 'En casa' })).toBeDefined();
    expect(screen.getByText('Ana (tú)')).toBeDefined();
    expect(screen.getByText('en casa desde 00:10')).toBeDefined();
    expect(screen.getByText('en casa desde 00:45')).toBeDefined();
    expect(screen.getByText('fuera desde el 5 ene')).toBeDefined();
    expect(screen.getByText('sin datos')).toBeDefined();
    expect(screen.getByText('A')).toBeDefined();
  });

  test('in a desktop column it is the same list inside the column', () => {
    setWindowWidth(1280);
    people.people = HOUSEHOLD.slice(0, 1);
    render(
      <Screen columns>
        <ScreenColumns>
          <ScreenColumn label="Cámaras y casa">
            <HomePeopleSection />
          </ScreenColumn>
        </ScreenColumns>
      </Screen>
    );
    expect(screen.getByLabelText('Cámaras y casa')).toBeDefined();
    expect(screen.getByText('Ana (tú)')).toBeDefined();
  });

  test('while the first answer is on its way it holds its place with a skeleton', () => {
    people.status = 'loading';
    render(<HomePeopleSection />);
    expect(screen.getByLabelText('Cargando quién está en casa').getAttribute('aria-busy')).toBe(
      'true'
    );
    expect(screen.getByRole('heading', { name: 'En casa' })).toBeDefined();
  });

  test('a failed answer says so and retries', async () => {
    let retried = 0;
    people.status = 'failed';
    people.retry = async () => {
      retried += 1;
    };
    render(<HomePeopleSection />);
    expect(screen.getByText('No se pudo saber quién está en casa')).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    });
    expect(retried).toBe(1);
  });

  test('a role without presence, or surveillance off, gets no section at all', () => {
    people.people = HOUSEHOLD;
    people.readable = false;
    const { container } = render(<HomePeopleSection />);
    expect(container.textContent).toBe('');
  });
});
