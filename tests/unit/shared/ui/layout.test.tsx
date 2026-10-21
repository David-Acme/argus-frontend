import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { space } from '@/shared/theme';
import { Cluster, Inline, Stack } from '@/shared/ui/layout/layout';

describe('layout helpers', () => {
  test('the numeric gap classes are the tokens.space scale', () => {
    for (const [step, pixels] of Object.entries(space))
      expect<number>(pixels).toBe(Number(step) * space[1]);
  });

  test('Stack, Inline and Cluster render their children in order', () => {
    render(
      <Stack>
        <Inline fill>
          <Text>Ver cámara</Text>
          <Text>Es conocido</Text>
        </Inline>
        <Cluster>
          <Text>Hoy 17:00</Text>
          <Text>Cada mes</Text>
        </Cluster>
      </Stack>
    );
    const words = screen.getAllByText(/./).map((node) => node.textContent);
    expect(words).toEqual(['Ver cámara', 'Es conocido', 'Hoy 17:00', 'Cada mes']);
  });
});
