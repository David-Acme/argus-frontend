import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AccessibilityInfo } from 'react-native';
import { heightLayoutOf, size, useEffectsOverrides } from '@/shared/theme';

import { Status } from '@/shared/ui/status/status';
import { CardStatus } from '@/shared/ui/status/status-card';
import { StatusFade } from '@/shared/ui/status/status-fade';
import { HeroStatus } from '@/shared/ui/status/status-hero';
import { heroStepOf } from '@/shared/ui/status/status-scale';
import { setWindowSize, setWindowWidth } from './window-width';

const STATS = [
  { icon: 'cam', value: '5', label: 'cámaras' },
  { value: '1', label: 'por revisar', tone: 'attn' },
] as const;

afterEach(() => {
  setWindowSize(360, 800);
  act(() => useEffectsOverrides.setState({ reduceMotion: null }));
});

const canvasWidths = (container: HTMLElement) =>
  [...container.querySelectorAll('canvas')].map((canvas) => canvas.style.width);

describe('Status', () => {
  test('the hero says its sentence as a heading with the meta and the stats', () => {
    const { container } = render(
      <Status
        tone="calm"
        sentence="Todo tranquilo."
        meta="En casa · Luis y tú en casa"
        stats={STATS}
        presence="idle"
      />
    );
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(screen.getByText('En casa · Luis y tú en casa')).toBeDefined();
    expect(screen.getByText('por revisar')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(canvasWidths(container)).toEqual(['66px']);
  });

  test('the dense hero draws the Seguridad presence beside its mode', () => {
    const { container } = render(
      <Status
        tone="calm"
        scale="dense"
        sentence="En casa"
        meta="Te aviso solo de desconocidos"
        presence="idle"
        presenceEvent={{ name: 'modechange', id: 1 }}
      />
    );
    expect(screen.getByRole('heading', { name: 'En casa' })).toBeDefined();
    expect(canvasWidths(container)).toEqual(['58px']);
  });

  test('the band keeps a long alert sentence whole', () => {
    setWindowWidth(1280);
    render(<Status tone="alert" sentence="3 personas en Patio trasero" meta="Ahora" />);
    const sentence = screen.getByRole('heading', { name: '3 personas en Patio trasero' });
    expect(sentence.textContent).toBe('3 personas en Patio trasero');
  });

  test('an alert hero is announced and the secondary hero draws a smaller presence', () => {
    const { container } = render(
      <HeroStatus
        tone="alert"
        scale="secondary"
        sentence="Alguien en el patio."
        meta="Hace 1 min"
        presence="alert"
      />
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(canvasWidths(container)).toEqual(['56px']);
  });

  test('on a wide window the hero becomes the band with its own aura', () => {
    setWindowWidth(1280);
    const { container } = render(
      <Status tone="calm" sentence="Todo tranquilo." meta="Modo En casa" stats={STATS} />
    );
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(container.querySelectorAll('radialGradient').length).toBe(3);
  });

  test('a stat with an action is a link named by its value and label', () => {
    const opened: string[] = [];
    render(
      <Status
        tone="calm"
        sentence="Todo tranquilo."
        meta="En casa"
        stats={[{ icon: 'cam', value: '5', label: 'cámaras', onPress: () => opened.push('cam') }]}
      />
    );
    fireEvent.click(screen.getByRole('link', { name: '5 cámaras' }));
    expect(opened).toEqual(['cam']);
  });

  test('the band can take an aura other than its tone', () => {
    setWindowWidth(1280);
    const stopColors = (aura?: 'off') => {
      const { container, unmount } = render(
        <Status tone="calm" sentence="Sin conexión." meta="Modo En casa" aura={aura} />
      );
      const colors = [...container.querySelectorAll('stop')].map((stop) =>
        stop.getAttribute('stop-color')
      );
      unmount();
      return colors;
    };
    expect(stopColors('off')).not.toEqual(stopColors());
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

  test('only an alert card is an alert, and it is announced on native when its sentence arrives', () => {
    const announce = mock((_message: string) => undefined);
    AccessibilityInfo.announceForAccessibility = announce;
    const card = (tone: 'attention' | 'alert', sentence: string) => (
      <CardStatus
        variant="card"
        tone={tone}
        sentence={sentence}
        primary={{ label: 'Ver', onPress: () => undefined }}
      />
    );
    const { rerender } = render(card('attention', 'Luis llega tarde.'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
    rerender(card('alert', 'Alguien en el patio.'));
    expect(screen.getByRole('alert')).toBeDefined();
    expect(announce.mock.calls).toEqual([['Alguien en el patio.']]);
  });

  test('an alert hero is announced on native', () => {
    const announce = mock((_message: string) => undefined);
    AccessibilityInfo.announceForAccessibility = announce;
    render(<HeroStatus tone="alert" sentence="Alguien en el patio." meta="Ahora" />);
    expect(announce.mock.calls).toEqual([['Alguien en el patio.']]);
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

  test('the hero steps down to the secondary sentence and the small Estela on short windows and on its side', () => {
    const at = (width: number, height: number) => heightLayoutOf({ width, height });
    expect(heroStepOf({ wide: false, height: at(390, 844) })).toEqual({
      variant: 'heroCompact',
      presence: size.presenceHero,
    });
    expect(heroStepOf({ wide: true, height: at(820, 1180) }).variant).toBe('hero');
    for (const [width, height] of [
      [320, 568],
      [360, 640],
      [740, 360],
    ] as const)
      expect(heroStepOf({ wide: width > 600, height: at(width, height) })).toEqual({
        variant: 'heroSecondary',
        presence: size.presenceHeroSmall,
      });
  });

  test('on a short phone the hero draws the small Estela beside its sentence', () => {
    setWindowSize(320, 568);
    const { container } = render(
      <HeroStatus tone="calm" sentence="Todo tranquilo" meta="Casa" stats={STATS} presence="idle" />
    );
    expect(screen.getByTestId('status-hero')).toBeDefined();
    expect(container.querySelector('canvas')?.style.width).toBe(`${size.presenceHeroSmall}px`);
  });
});
