import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { useCentrePresence, useHeroPresence } from '@/shared/ui/presence/presence-focus';

type CentreProps = { listening: boolean };

function Hero() {
  const paused = useHeroPresence();
  return <span>{paused ? 'hero still' : 'hero live'}</span>;
}

function Centre({ listening }: CentreProps) {
  const still = useCentrePresence(listening);
  return <span>{still ? 'centre still' : 'centre live'}</span>;
}

describe('one live Estela per screen', () => {
  test('alone, the bar centre is live', () => {
    render(<Centre listening={false} />);
    expect(screen.getByText('centre live')).toBeDefined();
  });

  test('a screen hero keeps the centre still, and leaving it brings the centre back', () => {
    const { rerender } = render(
      <>
        <Centre listening={false} />
        <Hero />
      </>
    );
    expect(screen.getByText('centre still')).toBeDefined();
    expect(screen.getByText('hero live')).toBeDefined();
    rerender(<Centre listening={false} />);
    expect(screen.getByText('centre live')).toBeDefined();
  });

  test('while listening the centre is the live one and the hero holds still', () => {
    render(
      <>
        <Centre listening />
        <Hero />
      </>
    );
    expect(screen.getByText('centre live')).toBeDefined();
    expect(screen.getByText('hero still')).toBeDefined();
  });
});
