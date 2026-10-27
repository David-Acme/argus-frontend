import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { processColor } from 'react-native';
import { illustration } from '@/shared/theme';
import { ClearText, Text, TextScaleProvider } from '@/shared/ui/text/text';

describe('Text', () => {
  test('renders its words and a heading role when asked', () => {
    render(
      <>
        <Text variant="hero" heading={1}>
          Todo tranquilo.
        </Text>
        <Text variant="meta">En casa · Luis y tú en casa</Text>
      </>
    );
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(screen.getByText('En casa · Luis y tú en casa')).toBeDefined();
    expect(screen.queryAllByRole('heading')).toHaveLength(1);
  });

  test('a clear run keeps its room in the line without showing, as a bubble reserves its time', () => {
    render(
      <Text variant="body">
        Hola
        <ClearText variant="caption">{' 21:54'}</ClearText>
      </Text>
    );
    const run = screen.getByText('21:54', { exact: false, selector: 'span' });
    expect(run.parentElement?.textContent).toBe('Hola 21:54');
  });

  test('a clear run is inked at alpha 0 but never ARGB 0, which Android Fabric reads as no colour', () => {
    const argb = Number(processColor(illustration.clearInk));
    expect(argb >>> 24).toBe(0);
    expect(argb | 0).not.toBe(0);
    expect(Number(processColor('transparent'))).toBe(0);
  });

  test('a heading carries its level, so the web does not make every heading an h1', () => {
    render(
      <>
        <Text variant="title" heading={1}>
          Seguridad
        </Text>
        <Text variant="section" heading={2}>
          Lo que pasó
        </Text>
        <Text variant="headline" heading={3}>
          Hay alguien en la puerta
        </Text>
      </>
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Seguridad');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Lo que pasó');
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Hay alguien en la puerta');
  });

  test('a font scale grows the size up to the variant cap', () => {
    render(
      <TextScaleProvider value={3}>
        <Text variant="title">Seguridad</Text>
        <Text variant="body">Pagar la luz</Text>
      </TextScaleProvider>
    );
    expect(screen.getByText('Seguridad').style.fontSize).toBe('36px');
    expect(screen.getByText('Pagar la luz').style.fontSize).toBe('32px');
  });
});
