import { afterEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffectsOverrides } from '@/shared/theme';

import { Status } from '@/shared/ui/status/status';
import { CardStatus } from '@/shared/ui/status/status-card';
import { StatusFade } from '@/shared/ui/status/status-fade';
import { HeroStatus } from '@/shared/ui/status/status-hero';
import { setWindowWidth } from './window-width';

const STATS = [
  { icon: 'cam', value: '5', label: 'cámaras' },
  { value: '1', label: 'por revisar', tone: 'attn' },
] as const;

afterEach(() => {
  setWindowWidth(360);
  act(() => useEffectsOverrides.setState({ reduceMotion: null }));
});

describe('Status', () => {
  test('the hero says its sentence as a heading with the meta and the stats', () => {
    const sizes: number[] = [];
    render(
      <Status
        tone="calm"
        sentence="Todo tranquilo."
        meta="En casa · Luis y tú en casa"
        stats={STATS}
        presence={(size) => {
          sizes.push(size);
          return null;
        }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(screen.getByText('En casa · Luis y tú en casa')).toBeDefined();
    expect(screen.getByText('por revisar')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(sizes).toEqual([66]);
  });

  test('an alert hero is announced and the secondary hero draws a smaller presence', () => {
    const sizes: number[] = [];
    render(
      <HeroStatus
        tone="alert"
        secondary
        sentence="Alguien en el patio."
        meta="Hace 1 min"
        presence={(size) => {
          sizes.push(size);
          return null;
        }}
      />
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(sizes).toEqual([56]);
  });

  test('on a wide window the hero becomes the band with its own aura', () => {
    setWindowWidth(1280);
    const { container } = render(
      <Status tone="calm" sentence="Todo tranquilo." meta="Modo En casa" stats={STATS} />
    );
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(container.querySelectorAll('radialGradient').length).toBe(3);
  });

  test('the card is an alert with one primary, one secondary and a quiet tertiary', () => {
    const pressed: string[] = [];
    render(
      <CardStatus
        variant="card"
        tone="alert"
        sentence="Alguien en el patio."
        meta="Patio trasero"
        primary={{ label: 'Ver cámara', onPress: () => void pressed.push('primary') }}
        secondaryAction={{ label: 'Es conocido', onPress: () => void pressed.push('secondary') }}
        tertiary={{ label: 'Es una falsa alarma', onPress: () => void pressed.push('tertiary') }}
      />
    );
    expect(screen.getByRole('alert')).toBeDefined();
    for (const name of ['Ver cámara', 'Es conocido', 'Es una falsa alarma'])
      fireEvent.click(screen.getByRole('button', { name }));
    expect(pressed).toEqual(['primary', 'secondary', 'tertiary']);
  });

  test('a card without a sentence keeps only its actions', () => {
    render(
      <Status variant="card" tone="alert" primary={{ label: 'Ver', onPress: () => undefined }} />
    );
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver' })).toBeDefined();
  });

  test('a change fades in, and reduced motion changes at once', () => {
    const live = render(
      <StatusFade change="a">
        <></>
      </StatusFade>
    );
    expect((live.container.firstElementChild as HTMLElement).getAttribute('style')).not.toBeNull();
    live.unmount();
    act(() => useEffectsOverrides.setState({ reduceMotion: true }));
    const still = render(
      <StatusFade change="a">
        <></>
      </StatusFade>
    );
    expect((still.container.firstElementChild as HTMLElement).getAttribute('style')).toBeNull();
  });
});
