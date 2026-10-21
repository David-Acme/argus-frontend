import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Avatar } from '@/shared/ui/avatar';

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
});
