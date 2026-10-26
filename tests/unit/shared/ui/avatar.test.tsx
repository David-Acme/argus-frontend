import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Avatar } from '@/shared/ui/avatar/avatar';
import { TextScaleProvider } from '@/shared/ui/text/text';

describe('Avatar', () => {
  test('a person avatar shows the initial and is named', () => {
    render(<Avatar initial="A" label="Ana Rojas" tone="accent" round size="large" />);
    expect(screen.getByRole('img', { name: 'Ana Rojas' })).toBeDefined();
    expect(screen.getByText('A')).toBeDefined();
  });

  test('an icon well is decorative', () => {
    const { container } = render(<Avatar icon="door" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  test('an event mark is a decorative calendar well', () => {
    const { container } = render(<Avatar icon="cal" tone="event" size="mark" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  test('an initial grows with the font scale only as far as its 36 px box holds it', () => {
    render(
      <TextScaleProvider value={2}>
        <Avatar initial="A" />
      </TextScaleProvider>
    );
    const style = getComputedStyle(screen.getByText('A'));
    expect([style.fontSize, style.lineHeight]).toEqual(['19.5px', '29.25px']);
  });
});
