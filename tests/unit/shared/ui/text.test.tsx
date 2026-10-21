import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Text, TextScaleProvider } from '@/shared/ui/text/text';

describe('Text', () => {
  test('renders its words and a heading role when asked', () => {
    render(
      <>
        <Text variant="hero" heading>
          Todo tranquilo.
        </Text>
        <Text variant="meta">En casa · Luis y tú en casa</Text>
      </>
    );
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(screen.getByText('En casa · Luis y tú en casa')).toBeDefined();
    expect(screen.queryAllByRole('heading')).toHaveLength(1);
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
