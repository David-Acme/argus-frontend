import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Chip, FilterChip } from '@/shared/ui/chip';

describe('Chip', () => {
  test('a tag reads its value and label, in every size', () => {
    render(
      <>
        <Chip label="En vivo" tone="ok" dot />
        <Chip label="cámaras" value="5" icon="cam" size="stat" />
        <Chip label="Muéstrame la cocina" size="suggestion" />
      </>
    );
    expect(screen.getByText('En vivo')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('Muéstrame la cocina')).toBeDefined();
  });

  test('a filter chip toggles and reports its selection', () => {
    let selected = false;
    const { rerender } = render(
      <FilterChip label="Hoy" selected={selected} onPress={() => (selected = !selected)} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(selected).toBe(true);
    rerender(<FilterChip label="Hoy" selected={selected} onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Hoy' }).getAttribute('aria-selected')).toBe('true');
  });
});
